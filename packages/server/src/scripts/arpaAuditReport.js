#!/usr/bin/env node
const tracer = require('dd-trace').init(); // eslint-disable-line no-unused-vars
const v8 = require('node:v8');
const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { log } = require('../lib/logging');
const { getSQSClient } = require('../lib/gost-aws');
const { processSQSMessageRequest } = require('../arpa_reporter/lib/audit-report');

const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const BYTES_PER_MB = 1024 * 1024;

function memoryStatsMB() {
    const { rss, heapUsed, heapTotal } = process.memoryUsage();
    return {
        rssMB: Math.round(rss / BYTES_PER_MB),
        heapUsedMB: Math.round(heapUsed / BYTES_PER_MB),
        heapTotalMB: Math.round(heapTotal / BYTES_PER_MB),
        heapLimitMB: Math.round(v8.getHeapStatistics().heap_size_limit / BYTES_PER_MB),
    };
}

async function main() {
    // Tracks the message currently being processed so that shutdown signals and crashes can
    // report what was lost. If ECS stops this task (e.g. autoscaling scale-in or a deployment)
    // while a report is being generated, the container is SIGKILLed after its stop timeout.
    const state = { inFlight: undefined };
    const inFlightDetails = () => (state.inFlight
        ? { ...state.inFlight.details, elapsedMs: Date.now() - state.inFlight.startedAt }
        : undefined);

    let shutDownRequested = false;
    const requestShutdown = (signal) => {
        if (state.inFlight) {
            log.error({ signal, inFlight: inFlightDetails(), memory: memoryStatsMB() },
                'Shutdown signal received while an audit report is still being generated; '
                + 'the task will be killed if processing does not finish before the ECS stop timeout');
        } else {
            log.warn({ signal }, 'Shutdown signal received. Requesting shutdown...');
        }
        shutDownRequested = true;
    };
    process.on('SIGTERM', requestShutdown);
    process.on('SIGINT', requestShutdown);

    // Log crashes in a structured form (with the in-flight message) before exiting, which matches
    // Node's default behavior of exiting with code 1.
    const logFatalAndExit = (err, origin) => {
        log.fatal({
            err, origin, inFlight: inFlightDetails(), memory: memoryStatsMB(),
        }, 'ARPA audit report worker crashed');
        process.exit(1);
    };
    process.on('unhandledRejection', (reason) => logFatalAndExit(reason, 'unhandledRejection'));
    process.on('uncaughtException', (err) => logFatalAndExit(err, 'uncaughtException'));

    const queueUrl = process.env.TASK_QUEUE_URL;
    log.info({
        queueUrl,
        pid: process.pid,
        nodeVersion: process.version,
        nodeOptions: process.env.NODE_OPTIONS,
        logLevel: process.env.LOG_LEVEL,
        memory: memoryStatsMB(),
    }, 'ARPA audit report worker started');

    const sqs = getSQSClient();
    while (shutDownRequested === false) {
        // eslint-disable-next-line no-await-in-loop
        await tracer.trace('arpaAuditReport', async () => {
            log.info({ queueUrl }, 'Long-polling next SQS message batch');
            const receiveResp = await sqs.send(new ReceiveMessageCommand({
                QueueUrl: process.env.TASK_QUEUE_URL,
                WaitTimeSeconds: 20,
                MaxNumberOfMessages: 1,
                MessageSystemAttributeNames: ['ApproximateReceiveCount', 'SentTimestamp'],
            }));
            const message = (receiveResp?.Messages || [])[0];
            if (message !== undefined) {
                const receivedAt = Date.now();
                const sentTimestamp = Number(message.Attributes?.SentTimestamp);
                const messageDetails = {
                    MessageId: message.MessageId,
                    // A receive count > 1 means a previous attempt failed or was killed before
                    // deleting the message. The message moves to the DLQ after maxReceiveCount.
                    receiveCount: Number(message.Attributes?.ApproximateReceiveCount),
                    // Time between the user's request and this worker picking it up. Includes
                    // autoscaling and Fargate task start-up time, plus any visibility timeouts.
                    queueWaitMs: Number.isNaN(sentTimestamp) ? undefined : receivedAt - sentTimestamp,
                };
                const msgLog = log.child({
                    sqs: { message: { ReceiptHandle: message.ReceiptHandle, ...messageDetails } },
                });
                msgLog.info({ memory: memoryStatsMB() }, 'Received SQS message for ARPA audit report');
                state.inFlight = { details: messageDetails, startedAt: receivedAt };
                const heartbeat = setInterval(() => {
                    msgLog.info({ elapsedMs: Date.now() - receivedAt, memory: memoryStatsMB() },
                        'Still processing ARPA audit report');
                }, HEARTBEAT_INTERVAL_MS);

                tracer.scope().active().setTag('message_received', 'true');
                let processingSuccessful;
                try {
                    processingSuccessful = await tracer.trace('processSQSMessageRequest',
                        async (span) => {
                            try {
                                return await processSQSMessageRequest(message);
                            } catch (e) {
                                msgLog.error(e, 'Error processing SQS message request for ARPA audit report');
                                span.setTag('error', e);
                            }
                            return false;
                        });
                } finally {
                    clearInterval(heartbeat);
                    state.inFlight = undefined;
                }
                const durationMs = Date.now() - receivedAt;
                if (processingSuccessful === true) {
                    msgLog.info({ durationMs }, 'Deleting successfully-processed SQS message');
                    tracer.scope().active().setTag('processing_successful', 'true');
                    await sqs.send(new DeleteMessageCommand({
                        QueueUrl: queueUrl,
                        ReceiptHandle: message.ReceiptHandle,
                    }));
                } else {
                    msgLog.warn({ durationMs }, 'SQS message was not processed successfully; will not delete');
                    tracer.scope().active().setTag('processing_successful', 'false');
                }
            } else {
                tracer.scope().active().setTag('message_received', 'false');
                log.info('Empty messages batch received from SQS');
            }
        });
    }
    log.warn('Shutting down');
}

if (require.main === module) {
    main().then(() => process.exit());
}
