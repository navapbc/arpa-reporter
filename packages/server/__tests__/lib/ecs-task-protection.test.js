const { expect } = require('chai');
const sinon = require('sinon');
const {
    setTaskProtection,
    protectTask,
    unprotectTask,
    taskProtectionUrl,
    MAX_EXPIRES_IN_MINUTES,
} = require('../../src/lib/ecs-task-protection');

const AGENT_URI = 'http://169.254.170.2/api/abc123';
const EXPECTED_URL = `${AGENT_URI}/task-protection/v1/state`;

function fakeLogger() {
    return {
        debug: sinon.fake(),
        info: sinon.fake(),
        warn: sinon.fake(),
        error: sinon.fake(),
    };
}

function jsonResponse(body, { status = 200 } = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    };
}

function protectionPayload(enabled) {
    return {
        protection: {
            ExpirationDate: enabled ? '2026-09-29T02:00:00.000Z' : null,
            ProtectionEnabled: enabled,
            TaskArn: 'arn:aws:ecs:us-east-2:123456789012:task/cluster/abc123',
        },
    };
}

describe('ECS task scale-in protection', () => {
    describe('taskProtectionUrl', () => {
        it('is undefined when ECS_AGENT_URI is not set', () => {
            expect(taskProtectionUrl({})).to.equal(undefined);
            expect(taskProtectionUrl({ ECS_AGENT_URI: '' })).to.equal(undefined);
        });

        it('appends the task protection path to ECS_AGENT_URI', () => {
            expect(taskProtectionUrl({ ECS_AGENT_URI: AGENT_URI })).to.equal(EXPECTED_URL);
        });

        it('tolerates a trailing slash on ECS_AGENT_URI', () => {
            expect(taskProtectionUrl({ ECS_AGENT_URI: `${AGENT_URI}/` })).to.equal(EXPECTED_URL);
        });
    });

    describe('setTaskProtection', () => {
        let log;
        let fetchImpl;
        const env = { ECS_AGENT_URI: AGENT_URI };

        beforeEach(() => {
            log = fakeLogger();
            fetchImpl = sinon.fake.resolves(jsonResponse(protectionPayload(true)));
        });

        it('is a no-op outside of ECS', async () => {
            const result = await setTaskProtection({
                enabled: true, expiresInMinutes: 5, log, fetchImpl, env: {},
            });
            expect(result).to.deep.equal({ status: 'skipped' });
            expect(fetchImpl.called).to.equal(false);
            expect(log.error.called).to.equal(false);
            expect(log.warn.called).to.equal(false);
        });

        it('PUTs ProtectionEnabled=true with the expiry to the agent endpoint', async () => {
            const result = await setTaskProtection({
                enabled: true, expiresInMinutes: 45, log, fetchImpl, env,
            });

            expect(result.status).to.equal('enabled');
            expect(result.protection).to.deep.equal(protectionPayload(true).protection);
            expect(fetchImpl.calledOnce).to.equal(true);
            const [url, options] = fetchImpl.firstCall.args;
            expect(url).to.equal(EXPECTED_URL);
            expect(options.method).to.equal('PUT');
            expect(options.headers).to.deep.equal({ 'content-type': 'application/json' });
            expect(JSON.parse(options.body)).to.deep.equal({ ProtectionEnabled: true, ExpiresInMinutes: 45 });
            expect(options.signal).to.be.an.instanceOf(AbortSignal);
            expect(log.info.calledOnce).to.equal(true);
            expect(log.error.called).to.equal(false);
        });

        it('omits ExpiresInMinutes when none is given so ECS applies its default', async () => {
            await setTaskProtection({
                enabled: true, log, fetchImpl, env,
            });
            expect(JSON.parse(fetchImpl.firstCall.args[1].body)).to.deep.equal({ ProtectionEnabled: true });
        });

        it('PUTs ProtectionEnabled=false without an expiry when disabling', async () => {
            fetchImpl = sinon.fake.resolves(jsonResponse(protectionPayload(false)));
            const result = await setTaskProtection({
                enabled: false, expiresInMinutes: 45, log, fetchImpl, env,
            });

            expect(result.status).to.equal('disabled');
            expect(JSON.parse(fetchImpl.firstCall.args[1].body)).to.deep.equal({ ProtectionEnabled: false });
        });

        it('rejects an out-of-range expiry before calling the agent', async () => {
            for (const expiresInMinutes of [0, -1, 1.5, MAX_EXPIRES_IN_MINUTES + 1, 'abc']) {
                let error;
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await setTaskProtection({
                        enabled: true, expiresInMinutes, log, fetchImpl, env,
                    });
                } catch (e) {
                    error = e;
                }
                expect(error, `expiresInMinutes=${expiresInMinutes}`).to.be.an.instanceOf(RangeError);
            }
            expect(fetchImpl.called).to.equal(false);
        });

        it('reports failure on a non-2xx response and logs an error when enabling', async () => {
            fetchImpl = sinon.fake.resolves(jsonResponse({
                error: { Code: 'AccessDeniedException', Message: 'not authorized', StatusCode: 403 },
            }, { status: 403 }));
            const result = await setTaskProtection({
                enabled: true, expiresInMinutes: 5, log, fetchImpl, env,
            });

            expect(result.status).to.equal('failed');
            expect(result.error).to.deep.equal({ Code: 'AccessDeniedException', Message: 'not authorized', StatusCode: 403 });
            expect(log.error.calledOnce).to.equal(true);
            expect(log.error.firstCall.args[0].httpStatus).to.equal(403);
            expect(log.warn.called).to.equal(false);
        });

        it('reports failure when the agent returns a failure object with a 200 status', async () => {
            fetchImpl = sinon.fake.resolves(jsonResponse({
                failure: { Arn: 'arn:aws:ecs:...', Detail: null, Reason: 'TASK_NOT_VALID' },
            }));
            const result = await setTaskProtection({
                enabled: true, expiresInMinutes: 5, log, fetchImpl, env,
            });

            expect(result.status).to.equal('failed');
            expect(result.error.Reason).to.equal('TASK_NOT_VALID');
            expect(log.error.calledOnce).to.equal(true);
        });

        it('reports failure when the response body is not JSON', async () => {
            fetchImpl = sinon.fake.resolves({
                ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); },
            });
            const result = await setTaskProtection({
                enabled: true, expiresInMinutes: 5, log, fetchImpl, env,
            });

            expect(result.status).to.equal('failed');
            expect(log.error.calledOnce).to.equal(true);
        });

        it('reports failure instead of throwing when the request itself fails', async () => {
            const networkError = new Error('connect ECONNREFUSED');
            fetchImpl = sinon.fake.rejects(networkError);
            const result = await setTaskProtection({
                enabled: true, expiresInMinutes: 5, log, fetchImpl, env,
            });

            expect(result.status).to.equal('failed');
            expect(result.error).to.equal(networkError);
            expect(log.error.calledOnce).to.equal(true);
            expect(log.error.firstCall.args[0].err).to.equal(networkError);
        });

        it('only warns (does not error) when disabling protection fails', async () => {
            fetchImpl = sinon.fake.rejects(new Error('timeout'));
            const result = await setTaskProtection({
                enabled: false, log, fetchImpl, env,
            });

            expect(result.status).to.equal('failed');
            expect(log.warn.calledOnce).to.equal(true);
            expect(log.error.called).to.equal(false);
        });
    });

    describe('protectTask / unprotectTask', () => {
        it('protectTask enables protection with the given expiry', async () => {
            const fetchImpl = sinon.fake.resolves(jsonResponse(protectionPayload(true)));
            const result = await protectTask({
                expiresInMinutes: 30, log: fakeLogger(), fetchImpl, env: { ECS_AGENT_URI: AGENT_URI },
            });
            expect(result.status).to.equal('enabled');
            expect(JSON.parse(fetchImpl.firstCall.args[1].body)).to.deep.equal({ ProtectionEnabled: true, ExpiresInMinutes: 30 });
        });

        it('unprotectTask disables protection and ignores any expiry passed to it', async () => {
            const fetchImpl = sinon.fake.resolves(jsonResponse(protectionPayload(false)));
            const result = await unprotectTask({
                expiresInMinutes: 30, log: fakeLogger(), fetchImpl, env: { ECS_AGENT_URI: AGENT_URI },
            });
            expect(result.status).to.equal('disabled');
            expect(JSON.parse(fetchImpl.firstCall.args[1].body)).to.deep.equal({ ProtectionEnabled: false });
        });
    });
});
