import { datadogRum } from '@datadog/browser-rum';
import * as fetchApi from '@/helpers/fetchApi';
import { formatFilterDisplay } from '@/helpers/filters';
import { serializeQuery } from '@/helpers/fetchApi';

const tableModes = {
  VIEW: 'view',
  MANAGE: 'manage',
  CREATE: 'create',
  EDIT: 'edit',
};

function initialState() {
  return {
    grantsPaginated: {},
    eligibilityCodes: [],
    fundingActivityCategories: [],
    interestedCodes: [],
    grantsInterested: [],
    closestGrants: [],
    totalUpcomingGrants: 0,
    totalInterestedGrants: 0,
    currentGrant: {},
    grantsRequestId: 0,
    searchFormFilters: {
      costSharing: null,
      opportunityStatuses: [],
      opportunityCategories: [],
      includeKeywords: null,
      excludeKeywords: null,
      opportunityNumber: null,
      postedWithin: null,
      fundingTypes: null,
      eligibility: null,
      reviewStatus: null,
      bill: null,
    },
    savedSearches: {},
    editingSearchId: null,
    selectedSearchId: null,
    selectedSearch: null,
    tableMode: tableModes.VIEW,
  };
}

function buildGrantsNextQuery({ filters, ordering, pagination }) {
  /*
  costSharing
  eligibility
  excludeKeywords
  fundingType
  includeKeywords
  opportunityCategories
  opportunityNumber
  opportunityStatuses
  postedWithin
  reviewStatus
  bill
  fundingActivityCategories
  */
  const criteria = { ...filters };
  // Validate and fix the inputs into appropriate types.
  criteria.includeKeywords = criteria.includeKeywords && criteria.includeKeywords.length > 0 ? criteria.includeKeywords.split(',').map((k) => k.trim().replace(/[^\w\s]/gi, '')) : null;
  criteria.excludeKeywords = criteria.excludeKeywords && criteria.excludeKeywords.length > 0 ? criteria.excludeKeywords.split(',').map((k) => k.trim().replace(/[^\w\s]/gi, '')) : null;
  criteria.eligibility = criteria.eligibility?.map((e) => e.code);
  criteria.fundingTypes = criteria.fundingTypes?.map((f) => f.code);
  criteria.bill = criteria.bill === 'All Bills' ? null : criteria.bill;
  criteria.fundingActivityCategories = criteria.fundingActivityCategories?.map((c) => c.code);

  if (!criteria.opportunityStatuses || criteria.opportunityStatuses.length === 0) {
    // by default, only show posted opportunities
    criteria.opportunityStatuses = ['posted'];
  }
  const paginationQuery = Object.entries(pagination)
    // filter out undefined and nulls since api expects parameters not present as undefined
    // eslint-disable-next-line no-unused-vars
    .filter(([key, value]) => value || typeof value === 'number')
    .map(([key, value]) => `pagination[${encodeURIComponent(key)}]=${encodeURIComponent(value)}`)
    .join('&');
  const orderingQuery = Object.entries(ordering)
    // filter out undefined and nulls since api expects parameters not present as undefined
    // eslint-disable-next-line no-unused-vars
    .filter(([key, value]) => value || typeof value === 'number')
    .map(([key, value]) => `ordering[${encodeURIComponent(key)}]=${encodeURIComponent(value)}`)
    .join('&');
  const criteriaQuery = Object.entries(criteria)
    // filter out undefined and nulls since api expects parameters not present as undefined
    // eslint-disable-next-line no-unused-vars
    .filter(([key, value]) => (typeof value === 'string' && value.length > 0) || typeof value === 'number' || (Array.isArray(value) && value.length > 0))
    .map(([key, value]) => `criteria[${encodeURIComponent(key)}]=${encodeURIComponent(value)}`)
    .join('&');
  return { criteriaQuery, paginationQuery, orderingQuery };
}

export default {
  namespaced: true,
  state: initialState,
  getters: {
    grants: (state) => state.grantsPaginated.data || [],
    grantsPagination: (state) => state.grantsPaginated.pagination,
    grantsInterested: (state) => state.grantsInterested,
    closestGrants: (state) => state.closestGrants,
    totalUpcomingGrants: (state) => state.totalUpcomingGrants,
    totalInterestedGrants: (state) => state.totalInterestedGrants,
    currentGrant: (state) => state.currentGrant,
    eligibilityCodes: (state) => state.eligibilityCodes,
    fundingActivityCategories: (state) => state.fundingActivityCategories,
    interestedCodes: (state) => ({
      rejections: state.interestedCodes.filter((c) => c.status_code === 'Rejected'),
      result: state.interestedCodes.filter((c) => c.status_code === 'Result'),
      interested: state.interestedCodes.filter((c) => c.status_code === 'Interested'),
    }),
    activeFilters(state) {
      return formatFilterDisplay(state.searchFormFilters);
    },
    searchFormFilters(state) {
      return state.searchFormFilters;
    },
    savedSearches: (state) => state.savedSearches,
    selectedSearchId: (state) => state.selectedSearchId,
    editingSearchId: (state) => state.editingSearchId,
    selectedSearch: (state) => state.selectedSearch,
    displaySearchPanel: (state) => state.tableMode === tableModes.CREATE || state.tableMode === tableModes.EDIT,
    displaySavedSearchPanel: (state) => state.tableMode === tableModes.MANAGE,
  },
  actions: {
    fetchGrants({ commit, rootGetters }, {
      currentPage, perPage, orderBy, orderDesc, searchTerm, interestedByMe,
      assignedToAgency, aging, positiveInterest, result, rejected, interestedByAgency,
      opportunityStatuses, opportunityCategories, costSharing,
    }) {
      const query = Object.entries({
        currentPage, perPage, orderBy, orderDesc, searchTerm, interestedByMe, assignedToAgency, aging, positiveInterest, result, rejected, interestedByAgency, opportunityStatuses, opportunityCategories, costSharing,
      })
        // filter out undefined and nulls since api expects parameters not present as undefined
        // eslint-disable-next-line no-unused-vars
        .filter(([key, value]) => value || typeof value === 'number')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants?${query}`)
        .then((data) => commit('SET_GRANTS', data));
    },
    fetchGrantsNext({ state, commit, rootGetters }, {
      currentPage, perPage, orderBy, orderDesc,
    }) {
      const pagination = { currentPage, perPage };
      const ordering = { orderBy, orderDesc };
      const filters = { ...this.state.grants.searchFormFilters };
      const { criteriaQuery, paginationQuery, orderingQuery } = buildGrantsNextQuery({ filters, ordering, pagination });

      // Avoid race conditions for tabs sharing grant fetching
      const requestId = state.grantsRequestId + 1;
      commit('SET_GRANTS_REQUEST_ID', requestId);
      return fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/next?${paginationQuery}&${orderingQuery}&${criteriaQuery}`)
        .then((data) => {
          if (requestId === state.grantsRequestId) {
            commit('SET_GRANTS', data);
          }
        });
    },
    // Retrieves grants that the user's team (or any subteam) has interacted with (either by setting status or assigning to a user).
    // Sorted in descending order by the date on which the interaction occurred (recently interacted with are first).
    fetchGrantsInterested({ commit, rootGetters }, { perPage, currentPage }) {
      return fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/grantsInterested/${perPage}/${currentPage}`)
        .then((data) => commit('SET_GRANTS_INTERESTED', data));
    },
    // Retrieves grants that the user's team (or any subteam) is interested in and that have closing dates in the future.
    // Sorted in ascending order by the closing date (grants that close soonest are first).
    fetchClosestGrants({ commit, rootGetters }, { perPage, currentPage }) {
      return fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/closestGrants/${perPage}/${currentPage}`)
        .then((data) => commit('SET_CLOSEST_GRANTS', data));
    },
    fetchGrantDetails({ commit, rootGetters }, { grantId }) {
      return fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/grantDetails`)
        .then((data) => commit('SET_GRANT_CURRENT', data));
    },
    markGrantAsViewed({ rootGetters }, { grantId, agencyId }) {
      return fetchApi.put(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/view/${agencyId}`);
    },
    getGrantAssignedAgencies({ rootGetters }, { grantId }) {
      return fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/assign/agencies`);
    },
    getInterestedAgencies({ rootGetters }, { grantId }) {
      return fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/interested`);
    },
    assignAgenciesToGrant({ rootGetters }, { grantId, agencyIds }) {
      return fetchApi.post(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/assign/agencies`, {
        agencyIds,
      });
    },
    unassignAgenciesToGrant({ rootGetters }, { grantId, agencyIds }) {
      return fetchApi.deleteRequest(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/assign/agencies`, {
        agencyIds,
      });
    },
    async unmarkGrantAsInterested({ rootGetters, commit, dispatch }, {
      grantId, agencyIds, interestedCode, agencyId,
    }) {
      await fetchApi.deleteRequest(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/interested/${agencyId}`, {
        agencyIds,
        interestedCode,
      });
      const interestedAgencies = await dispatch('getInterestedAgencies', { grantId });
      commit('UPDATE_GRANT', { grantId, data: { interested_agencies: interestedAgencies } });
    },
    async markGrantAsInterested({ commit, rootGetters }, { grantId, agencyId, interestedCode }) {
      const interestedAgencies = await fetchApi.put(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/interested/${agencyId}`, {
        interestedCode,
      });
      commit('UPDATE_GRANT', { grantId, data: { interested_agencies: interestedAgencies } });
    },
    fetchEligibilityCodes({ commit, rootGetters }) {
      fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/eligibility-codes`)
        .then((data) => commit('SET_ELIGIBILITY_CODES', data));
    },
    fetchSearchConfig({ commit, rootGetters }) {
      fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/search-config`)
        .then((data) => commit('SET_SEARCH_CONFIG', data));
    },
    fetchInterestedCodes({ commit, rootGetters }) {
      fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/interested-codes`)
        .then((data) => commit('SET_INTERESTED_CODES', data));
    },
    async getFollowerForGrant({ rootGetters, commit }, { grantId }) {
      try {
        return await fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/follow`);
      } catch (e) {
        // 404 -> User not following
        if (e.response.status === 404) {
          return null;
        }

        const text = `Error retrieving grant follower: + ${e.message}`;
        commit('alerts/addAlert', { text, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text });
        return null;
      }
    },
    async getFollowersForGrant({ rootGetters, commit }, { grantId, limit, cursor }) {
      const queryParams = serializeQuery({ limit, cursor });
      try {
        return await fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/followers${queryParams}`);
      } catch (e) {
        const text = `Error retrieving grant followers: ${e.message}`;
        commit('alerts/addAlert', { text, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text });
        return null;
      }
    },
    async getNotesForGrant({ rootGetters, commit }, { grantId, limit, cursor }) {
      const queryParams = serializeQuery({ limit, cursor });
      try {
        return await fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/notes${queryParams}`);
      } catch (e) {
        const text = `Error retrieving grant notes: ${e.message}`;
        commit('alerts/addAlert', { text, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text });
        return null;
      }
    },
    async getNotesForCurrentUser({ rootGetters, commit }, { grantId }) {
      try {
        const userId = rootGetters['users/loggedInUser']?.id;
        const queryParams = serializeQuery({ limit: 1 });
        return await fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/notes/user/${userId}${queryParams}`);
      } catch (e) {
        const text = `Error retrieving grant notes for user: ${e.message}`;
        commit('alerts/addAlert', { text, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text });
        return null;
      }
    },
    async saveNoteForGrant({ rootGetters, commit }, { grantId, text }) {
      try {
        await fetchApi.put(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/notes/revision`, {
          text,
        });
      } catch (e) {
        const errTxt = `Error saving grant note: ${e.message}`;
        commit('alerts/addAlert', { text: errTxt, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text: errTxt });
        throw e;
      }
    },
    async deleteGrantNoteForUser({ rootGetters, commit }, { grantId }) {
      try {
        const userId = rootGetters['users/loggedInUser']?.id;
        await fetchApi.deleteRequest(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/notes/user/${userId}`);
      } catch (e) {
        const text = `Error deleting grant note for user: ${e.message}`;
        commit('alerts/addAlert', { text, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text });
        throw e;
      }
    },
    async followGrantForCurrentUser({ rootGetters, commit }, { grantId }) {
      try {
        await fetchApi.put(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/follow`);
      } catch (e) {
        const text = `Error following grant: ${e.message}`;
        commit('alerts/addAlert', { text, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text });
        throw e;
      }
    },
    async unfollowGrantForCurrentUser({ rootGetters, commit }, { grantId }) {
      try {
        await fetchApi.deleteRequest(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/${grantId}/follow`);
      } catch (e) {
        const text = `Error unfollowing grant: ${e.message}`;
        commit('alerts/addAlert', { text, level: 'err' }, { root: true });
        datadogRum.addError(e, { grantId, text });
        throw e;
      }
    },
    async setEligibilityCodeEnabled({ rootGetters }, { code, enabled }) {
      await fetchApi.put(`/api/organizations/${rootGetters['users/selectedAgencyId']}/eligibility-codes/${code}/enable/${enabled}`);
    },
    async fetchSavedSearches({ commit, rootGetters }, {
      currentPage, perPage,
    }) {
      // TODO: Add pagination URL parameters.
      const paginationQuery = Object.entries({ currentPage, perPage })
      // filter out undefined and nulls since api expects parameters not present as undefined
      // eslint-disable-next-line no-unused-vars
        .filter(([key, value]) => value || typeof value === 'number')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      const data = await fetchApi.get(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants-saved-search?${paginationQuery}`);
      commit('SET_SAVED_SEARCHES', data);
    },
    async createSavedSearch({ rootGetters }, { searchInfo }) {
      return fetchApi.post(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants-saved-search`, searchInfo);
    },
    async updateSavedSearch({ rootGetters }, { searchId, searchInfo }) {
      await fetchApi.put(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants-saved-search/${searchId}`, searchInfo);
    },
    async deleteSavedSearch({ rootGetters }, { searchId }) {
      await fetchApi.deleteRequest(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants-saved-search/${searchId}`);
    },
    changeSelectedSearchId({ commit }, searchId) {
      commit('SET_SELECTED_SEARCH_ID', searchId);
    },
    changeEditingSearchId({ commit }, searchId) {
      commit('SET_EDITING_SEARCH_ID', searchId);
    },
    exportCSV({ rootGetters }, {
      currentPage, perPage, orderBy, orderDesc,
    }) {
      const pagination = { currentPage, perPage };
      const ordering = { orderBy, orderDesc };
      const filters = { ...this.state.grants.searchFormFilters };
      const { criteriaQuery, paginationQuery, orderingQuery } = buildGrantsNextQuery({ filters, ordering, pagination });
      const navUrl = fetchApi.apiURL(
        `/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/exportCSVNew?${paginationQuery}&${orderingQuery}&${criteriaQuery}`,
      );
      window.location = navUrl;
    },
    exportCSVRecentActivities({ rootGetters }) {
      window.location = fetchApi.apiURL(`/api/organizations/${rootGetters['users/selectedAgencyId']}/grants/exportCSVRecentActivities`);
    },
    applyFilters(context, filters) {
      context.commit('APPLY_FILTERS', filters);
    },
    removeFilter(context, key) {
      context.commit('REMOVE_FILTER', key);
    },
    clearSelectedSearch(context) {
      context.commit('CLEAR_SEARCH');
    },
    // table action state
    initNewSearch(context) {
      context.commit('SET_EDITING_SEARCH_ID', null);
      context.commit('SET_TABLE_MODE', tableModes.CREATE);
    },
    initEditSearch(context, searchId) {
      context.commit('SET_EDITING_SEARCH_ID', searchId);
      context.commit('SET_TABLE_MODE', tableModes.EDIT);
    },
    initManageSearches(context) {
      context.commit('SET_TABLE_MODE', tableModes.MANAGE);
    },
    initViewResults(context) {
      context.commit('SET_EDITING_SEARCH_ID', null);
      context.commit('SET_TABLE_MODE', tableModes.VIEW);
    },
  },
  mutations: {
    SET_GRANTS(state, grants) {
      state.grantsPaginated = grants;
    },
    UPDATE_GRANT(state, { grantId, data }) {
      if (state.grantsPaginated.data) {
        const grant = state.grantsPaginated.data.find((g) => g.grant_id === grantId);
        if (grant) {
          Object.assign(grant, data);
        }
      }
      if (state.currentGrant && state.currentGrant.grant_id === grantId) {
        Object.assign(state.currentGrant, data);
      }
    },
    SET_ELIGIBILITY_CODES(state, eligibilityCodes) {
      state.eligibilityCodes = eligibilityCodes;
    },
    SET_SEARCH_CONFIG(state, searchConfig) {
      state.eligibilityCodes = searchConfig.eligibilityCodes;
      state.fundingActivityCategories = searchConfig.fundingActivityCategories;
    },
    SET_INTERESTED_CODES(state, interestedCodes) {
      state.interestedCodes = interestedCodes;
    },
    SET_GRANTS_INTERESTED(state, grantsInterested) {
      state.grantsInterested = grantsInterested.data;
      state.totalInterestedGrants = grantsInterested.pagination.total;
    },
    SET_GRANT_CURRENT(state, currentGrant) {
      state.currentGrant = currentGrant;
    },
    SET_CLOSEST_GRANTS(state, closestGrants) {
      state.closestGrants = closestGrants.data;
      state.totalUpcomingGrants = closestGrants.pagination.total;
    },
    APPLY_FILTERS(state, filters) {
      state.searchFormFilters = filters;
    },
    REMOVE_FILTER(state, key) {
      state.searchFormFilters[key] = initialState().searchFormFilters[key];
    },
    CLEAR_SEARCH(state) {
      const emptyState = initialState();
      state.searchFormFilters = emptyState.searchFormFilters;
      state.selectedSearch = emptyState.selectedSearch;
      state.selectedSearchId = emptyState.selectedSearchId;
    },
    SET_SAVED_SEARCHES(state, savedSearches) {
      state.savedSearches = savedSearches;
    },
    SET_SELECTED_SEARCH_ID(state, searchId) {
      if (searchId === null || searchId === undefined || Number.isNaN(searchId)) {
        state.selectedSearchId = null;
        state.selectedSearch = null;
        return;
      }
      state.selectedSearchId = searchId;
      const data = state.savedSearches.data || [];
      state.selectedSearch = data.find((search) => search.id === searchId);
    },
    SET_EDITING_SEARCH_ID(state, searchId) {
      state.editingSearchId = searchId;
    },
    SET_TABLE_MODE(state, tableMode) {
      state.tableMode = tableMode;
    },
    SET_GRANTS_REQUEST_ID(state, id) {
      state.grantsRequestId = id;
    },
  },
};
