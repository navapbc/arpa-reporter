// require('dotenv').config();

const agencies = require('./ref/agencies');
const roles = require('./ref/roles');
const eligibilityCodes = require('./ref/eligibilityCodes');
const interestedCodes = require('./ref/interestedCodes');
const keywords = require('./ref/keywords');
const userList = require('./ref/users');
const { grants, assignedGrantsAgency, grantsInterested } = require('./ref/grants');
const tenants = require('./ref/tenants');
const { grantsSavedSearches } = require('./ref/grantsSavedSearches');

const navaAgency = agencies.find((a) => a.abbreviation === 'Nava');
// const nevadaAgency = agencies.find((a) => a.abbreviation === 'NV');

const adminList = [
    // Update me with the appropiate initial admin users
    {
        email: 'gf-admin@navapbc.com',
        name: 'GRANT ADMIN',
        agency_id: navaAgency.id,
        role_id: roles[0].id,
        tenant_id: tenants[0].id,
    },
];

const agencyUserList = [
    // update me with non admin agency user
    // {
    //     email: 'xmattingly@fastmail.net',
    //     name: 'Staff Mattingly',
    //     agency_id: navaAgency.id,
    //     role_id: roles[1].id,
    // },
];

const globalCodes = [
    '00', '06', '07', '25', '99',
];

exports.seed = async (knex) => {
    const tables = ['agency_eligibility_codes', 'grant_notes_revisions', 'grant_followers', 'grant_notes', 'keywords', 'eligibility_codes', 'grants', 'assigned_grants_agency', 'grants_interested', 'grants_saved_searches'];

    // eslint-disable-next-line no-restricted-syntax
    for (const table of tables) {
        // eslint-disable-next-line no-await-in-loop
        await knex(table).del();
    }

    await knex('tenants').insert(tenants)
        .onConflict('id')
        .merge();

    await knex('roles').insert(roles)
        .onConflict('id')
        .merge();

    await knex('agencies').insert(agencies)
        .onConflict('id')
        .merge();

    // We need to now set the main_agency_id on tenants that have specified
    // the Nava agency as a parent.
    await knex.raw(`WITH main_agency_lookup AS (
                    SELECT id, tenant_id
                    FROM agencies
                    WHERE parent = ${navaAgency.id}
                ) UPDATE tenants
                    SET main_agency_id = mal.id
                    FROM main_agency_lookup mal
                    WHERE mal.tenant_id = tenants.id;`);

    if (userList.length) {
        await knex('users').insert(userList)
            .onConflict('email')
            .merge();
        // Postgres sequences can get "out of sync", e.g. after we INSERTed with explicit id values.
        // Put the sequence back "in sync" to avoid duplicate key value errors.
        await knex.raw('SELECT setval(\'users_id_seq\', (SELECT MAX(id) FROM users) + 1);');
    }

    if (adminList.length) {
        await knex('users').insert(adminList)
            .onConflict('email')
            .merge();
    }

    if (agencyUserList.length) {
        await knex('users').insert(agencyUserList)
            .onConflict('email')
            .merge();
    }

    await knex('eligibility_codes').insert(eligibilityCodes)
        .onConflict('code')
        .merge();

    await knex('keywords').insert(keywords)
        .onConflict('id')
        .merge();

    await knex('agency_eligibility_codes').insert([].concat(...agencies
        .map(
            (agency) => eligibilityCodes.map((eC) => ({
                agency_id: agency.id, code: eC.code, enabled: globalCodes.includes(eC.code),
            })),
        )))
        .onConflict(['agency_id', 'code'])
        .merge();

    await knex('interested_codes')
        .insert(interestedCodes)
        .onConflict('id')
        .merge();

    await knex('grants').insert(grants);
    await knex('assigned_grants_agency').insert(assignedGrantsAgency);
    await knex('grants_interested').insert(grantsInterested);
    await knex('grants_saved_searches').insert(grantsSavedSearches);
};
