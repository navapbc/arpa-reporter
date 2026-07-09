// server/seeds/dev/ref/users.js

const agencies = require('./agencies');
const roles = require('./roles');
const tenants = require('./tenants');

const adminRole = roles.find(({ name }) => name === 'admin');
const staffRole = roles.find(({ name }) => name === 'staff');

const navaAgency = agencies.find((a) => a.abbreviation === 'Nava');
const navaSubAgency = agencies.find((a) => a.abbreviation === 'TSDR');
const nevadaAgency = agencies.find((a) => a.abbreviation === 'NV');
const procurementAgency = agencies.find((a) => a.abbreviation === 'NPO');
const dallasAgency = agencies.find((a) => a.abbreviation === 'DLA');

const navaTenant = tenants.find((t) => t.display_name === 'Nava Tenant');
const nevadaenant = tenants.find((t) => t.display_name === 'Nevada Tenant');
const procurementTenant = tenants.find((t) => t.display_name === 'NPO Tenant');
const dallasTenant = tenants.find((t) => t.display_name === 'Dallas Agency');

module.exports = [
    {
        id: 1,
        email: 'alex@navapbc.com',
        name: 'Alex Allain',
        agency_id: navaAgency.id,
        role_id: adminRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#198754',

    },
    {
        id: 2,
        email: 'mindy@navapbc.com', // fake email for testing
        name: 'Mindy Huang',
        agency_id: navaAgency.id,
        role_id: adminRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E14',

    },
    {
        id: 3,
        email: 'joecomeau01@gmail.com',
        name: 'Joe Comeau',
        agency_id: navaAgency.id,
        role_id: adminRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E17',
    },
    {
        id: 4,
        email: 'asridhar@navapbc.com',
        name: 'Aditya Sridhar',
        agency_id: navaAgency.id,
        role_id: adminRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E15',
    },
    {
        id: 5,
        email: 'thendrickson@navapbc.com',
        name: 'Tyler Hendrickson',
        agency_id: navaAgency.id,
        role_id: adminRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E16',
    },
    {
        id: 6,
        email: 'user1@nv.example.com', // fake email for testing
        name: 'nv.gov User 1',
        agency_id: nevadaAgency.id,
        role_id: staffRole.id,
        tenant_id: nevadaenant.id,
        avatar_color: '#ED7E2F',
    },
    {
        id: 7,
        email: 'user2@nv.example.com', // fake email for testing
        name: 'nv.gov User 2',
        agency_id: nevadaAgency.id,
        role_id: staffRole.id,
        tenant_id: nevadaenant.id,
        avatar_color: '#FD7E14',
    },
    {
        id: 8,
        email: 'user3@nv.example.com', // fake email for testing
        name: 'nv.gov User 3',
        agency_id: nevadaAgency.id,
        role_id: staffRole.id,
        tenant_id: nevadaenant.id,
        avatar_color: '#ED7E19',
    },
    {
        id: 9,
        email: 'user1@npo.nv.gov', // fake email for testing
        name: 'npo.nv.gov User 1',
        agency_id: procurementAgency.id,
        role_id: staffRole.id,
        tenant_id: procurementTenant.id,
        avatar_color: '#ED7E1A',
    },
    {
        id: 10,
        email: 'user2@npo.nv.gov', // fake email for testing
        name: 'npo.nv.gov User 2',
        agency_id: procurementAgency.id,
        role_id: staffRole.id,
        tenant_id: procurementTenant.id,
        avatar_color: '#ED7E1B',
    },
    {
        id: 11,
        email: 'user3@npo.nv.gov', // fake email for testing
        name: 'npo.nv.gov User 3',
        agency_id: procurementAgency.id,
        role_id: staffRole.id,
        tenant_id: procurementTenant.id,
        avatar_color: '#ED7E1C',
    },
    {
        id: 12,
        email: 'user1@dallas.gov', // fake email for testing
        name: 'dallas.gov User 1',
        agency_id: dallasAgency.id,
        role_id: adminRole.id,
        tenant_id: dallasTenant.id,
        avatar_color: '#ED7E1D',
    },
    {
        id: 13,
        email: 'admin1@nv.example.com', // fake email for testing
        name: 'nv.gov Admin User 1',
        agency_id: nevadaAgency.id,
        role_id: adminRole.id,
        tenant_id: nevadaenant.id,
        avatar_color: '#198754',
    },
    {
        id: 14,
        email: 'mindy+testsub@navapbc.com',
        name: 'Nava tenant sub agency user',
        agency_id: navaSubAgency.id,
        role_id: staffRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E1F',
    },
    {
        id: 15,
        email: 'nat.hillard.usdr@gmail.com',
        name: 'Nat Hillard',
        agency_id: navaSubAgency.id,
        role_id: adminRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E20',
    },
    {
        id: 16,
        email: 'admin1@navapbc.com',
        name: 'Nava tenant sub agency admin',
        agency_id: navaSubAgency.id,
        role_id: staffRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E21',
    },
    {
        id: 17,
        email: 'admin@example.com',
        name: 'Nava Admin',
        agency_id: navaAgency.id,
        role_id: adminRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E22',
    },
    {
        id: 18,
        email: 'staff@example.com',
        name: 'Nava Staff',
        agency_id: navaAgency.id,
        role_id: staffRole.id,
        tenant_id: navaTenant.id,
        avatar_color: '#ED7E23',
    },
];
