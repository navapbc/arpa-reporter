/**
 * ECS task scale-in protection.
 *
 * A worker that is processing a message can mark its own ECS task as "protected" so that Service
 * Auto Scaling scale-in activities (and deployments) do not stop the task until processing is
 * finished or the protection expires. Without this, a scale-in event sends SIGTERM to the task
 * and, once the container's stop timeout elapses, SIGKILL, which loses the in-progress work
 * without any error being logged or reported.
 *
 * The ECS agent exposes the protection endpoint to the container at
 * `$ECS_AGENT_URI/task-protection/v1/state` (Fargate platform version 1.4.0+); the request is made
 * with the task IAM role's credentials, which must allow `ecs:UpdateTaskProtection`.
 *
 * Outside of ECS (local development, tests) `ECS_AGENT_URI` is unset and every call is a no-op.
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-scale-in-protection-endpoint.html
 */
const { log: defaultLog } = require('./logging');

const TASK_PROTECTION_PATH = '/task-protection/v1/state';
const DEFAULT_REQUEST_TIMEOUT_MS = 5 * 1000;

// ECS accepts 1 to 2880 minutes (48 hours) and defaults to 120 when the value is omitted.
const MIN_EXPIRES_IN_MINUTES = 1;
const MAX_EXPIRES_IN_MINUTES = 2880;

/**
 * @returns {string|undefined} URL of the ECS agent's task protection endpoint, or undefined when
 * not running in ECS.
 */
function taskProtectionUrl(env = process.env) {
    const agentUri = env.ECS_AGENT_URI;
    if (!agentUri) {
        return undefined;
    }
    return `${agentUri.replace(/\/+$/, '')}${TASK_PROTECTION_PATH}`;
}

/**
 * Sets or clears scale-in protection for the ECS task this process is running in.
 *
 * Never throws: a failure to update protection is logged and reported in the return value so
 * that the caller can carry on with (or without) the protection.
 *
 * @param {object} options
 * @param {boolean} options.enabled - true to protect the task, false to remove protection.
 * @param {number} [options.expiresInMinutes] - How long protection should last when enabling.
 *   ECS defaults to 120 minutes when omitted. Ignored when disabling.
 * @param {object} [options.log] - Logger to use (bunyan/pino-compatible).
 * @param {Function} [options.fetchImpl] - fetch implementation (for tests).
 * @param {number} [options.timeoutMs] - Request timeout.
 * @param {object} [options.env] - Environment variables (for tests).
 * @returns {Promise<{status: 'enabled'|'disabled'|'skipped'|'failed', protection?: object, error?: any}>}
 */
async function setTaskProtection({
    enabled,
    expiresInMinutes,
    log = defaultLog,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    env = process.env,
}) {
    const url = taskProtectionUrl(env);
    if (url === undefined) {
        log.debug({ protectionEnabled: enabled },
            'ECS_AGENT_URI is not set; skipping ECS task scale-in protection update');
        return { status: 'skipped' };
    }

    const body = { ProtectionEnabled: enabled };
    if (enabled && expiresInMinutes !== undefined) {
        if (!Number.isInteger(expiresInMinutes)
            || expiresInMinutes < MIN_EXPIRES_IN_MINUTES
            || expiresInMinutes > MAX_EXPIRES_IN_MINUTES) {
            throw new RangeError(
                `expiresInMinutes must be an integer between ${MIN_EXPIRES_IN_MINUTES} and ${MAX_EXPIRES_IN_MINUTES}`,
            );
        }
        body.ExpiresInMinutes = expiresInMinutes;
    }

    // Failing to enable protection means the task can be killed mid-processing, so that is
    // logged as an error; failing to disable it only delays scale-in until the protection expires.
    const logFailure = enabled ? log.error.bind(log) : log.warn.bind(log);
    try {
        const response = await fetchImpl(url, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
        });
        let payload;
        try {
            payload = await response.json();
        } catch (e) {
            payload = undefined;
        }

        // The agent reports problems either via a non-2xx status or via a `failure`/`error`
        // object in the response body in place of `protection`.
        if (!response.ok || payload?.failure || payload?.error || !payload?.protection) {
            logFailure({ httpStatus: response.status, response: payload, request: body },
                'Failed to update ECS task scale-in protection');
            return { status: 'failed', error: payload?.failure || payload?.error || { httpStatus: response.status } };
        }

        log.info({ protection: payload.protection, request: body },
            enabled ? 'Enabled ECS task scale-in protection' : 'Disabled ECS task scale-in protection');
        return { status: enabled ? 'enabled' : 'disabled', protection: payload.protection };
    } catch (err) {
        logFailure({ err, request: body }, 'Error while updating ECS task scale-in protection');
        return { status: 'failed', error: err };
    }
}

/**
 * Enables scale-in protection for the current task.
 * @see setTaskProtection
 */
function protectTask(options = {}) {
    return setTaskProtection({ ...options, enabled: true });
}

/**
 * Disables scale-in protection for the current task.
 * @see setTaskProtection
 */
function unprotectTask(options = {}) {
    return setTaskProtection({ ...options, enabled: false, expiresInMinutes: undefined });
}

module.exports = {
    setTaskProtection,
    protectTask,
    unprotectTask,
    taskProtectionUrl,
    MIN_EXPIRES_IN_MINUTES,
    MAX_EXPIRES_IN_MINUTES,
};
