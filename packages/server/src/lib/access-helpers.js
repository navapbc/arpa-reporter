const tracer = require('dd-trace');
const { getUser, inTenant } = require('../db');

const USDR_TENANT_ID = 1;
const USDR_AGENCY_ID = 0;
const USDR_EMAIL_DOMAIN = 'navapbc.com';

function isUSDR(user) {
    return user.tenant_id === USDR_TENANT_ID;
}

function isUSDRSuperAdmin(user) {
    // Note: this function assumes an augmented user object from db.getUser(), not just a raw DB row
    // (necessary for role_name field)
    return (
        isUSDR(user)
        && user.agency_id === USDR_AGENCY_ID
        && user.role_name === 'admin'
        // TODO: Right now there are a bunch of non-USDR users in USDR tenant in prod, so we need to
        // restrict this further. But this will also prevent USDR volunteers from having this permission.
        && user.email.endsWith(`@${USDR_EMAIL_DOMAIN}`)
    );
}

/**
 * Determine if the user's agency or subagencies includes the given agency.
 *
 * @param {Object} user
 * @param {Number} agencyId
 * @returns {Boolean} true if the agency is a subagency or same agency of the user
 * */
function isAuthorizedForAgency(user, agencyId) {
    const subagency = user.agency.subagencies.find(
        (agency) => agency.id === agencyId,
    );

    if (subagency) {
        return true;
    }

    return false;
}

/**
 * Determine if a user is authorized for an agency.
 *
 * @param {Object} user
 * @param {...Number} agencyIds
 * @returns {Boolean} true if the agency is in the same tenant as the user
 * */
async function isUserAuthorized(user, ...agencyIds) {
    return inTenant(user.tenant_id, agencyIds);
}

async function getAdminAuthInfo(req) {
    if (!req.signedCookies.userId) {
        throw new Error('Unauthorized');
    }

    const user = await getUser(req.signedCookies.userId);
    if (!user) {
        throw new Error('Unauthorized');
    }

    if (user.role_name !== 'admin') {
        throw new Error('Unauthorized');
    }

    let selectedAgency = user.agency_id;
    const requestAgency = Number(req.params.organizationId);
    if (!Number.isNaN(requestAgency)) {
        const authorized = await isUserAuthorized(user, requestAgency);
        if (!authorized) {
            throw new Error('Unauthorized');
        }
        selectedAgency = requestAgency;
    }

    return { user, selectedAgency };
}

async function requireAdminUser(req, res, next) {
    try {
        const { user, selectedAgency } = await getAdminAuthInfo(req);
        req.session = { ...req.session, user, selectedAgency };
        tracer.setUser({
            id: user.id,
            agency_id: user.agency_id,
            tenant_id: user.tenant_id,
            role_name: user.role_name,
            selected_agency_id: selectedAgency,
            is_user_super_admin: isUSDRSuperAdmin(user),
        });
    } catch (err) {
        res.sendStatus(403);
        return;
    }

    next();
}

async function requireUser(req, res, next) {
    if (!req.signedCookies.userId) {
        res.sendStatus(403);
        return;
    }

    const user = await getUser(req.signedCookies.userId);
    if (!user) {
        res.sendStatus(403);
        return;
    }

    if (req.params.organizationId && user.role_name === 'staff' && (req.params.organizationId !== user.agency_id.toString())) {
        res.sendStatus(403); // Staff are restricted to their own agency.
        return;
    }

    // User NOT required to be admin; but if they ARE, they must satisfy admin rules.
    if (user.role_name === 'admin') {
        await requireAdminUser(req, res, next);
        return;
    }

    req.session = { ...req.session, user, selectedAgency: user.agency_id };

    tracer.setUser({
        id: req.session.user?.id,
        role: req.session.user?.role.name,
        tenant_id: req.session.user?.tenant?.id,
        agency_id: req.session.user?.agency?.id,
    });

    next();
}

async function requireUSDRSuperAdminUser(req, res, next) {
    await requireAdminUser(req, res, () => {
        if (!isUSDRSuperAdmin(req.session.user)) {
            res.sendStatus(403);
            return;
        }

        next();
    });
}

async function isMicrosoftSafeLinksRequest(req, res, next) {
    const userAgent = req.headers['user-agent'] || '';
    const nativeHost = req.headers['x-native-host'] || '';
    if (userAgent.toLowerCase().includes('oneoutlook') || nativeHost.toLowerCase().includes('oneoutlook')) {
        req.log.info({
            'user-agent': userAgent,
            'native-host': nativeHost,
            headers: Object.keys(req.headers),
        }, 'Microsoft Safe Links request');
        res.json({ message: 'Success' });
        return;
    }

    next();
}

module.exports = {
    requireAdminUser, requireUser, isAuthorizedForAgency, isUserAuthorized, isUSDR, isUSDRSuperAdmin, requireUSDRSuperAdminUser, getAdminAuthInfo, isMicrosoftSafeLinksRequest,
};
