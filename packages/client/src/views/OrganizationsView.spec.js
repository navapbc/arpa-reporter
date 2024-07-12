import {
  describe, beforeEach, afterEach, it, expect,
} from 'vitest';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import OrganizationsView from '@/views/OrganizationsView.vue';
import { BootstrapVue, BootstrapVueIcons } from 'bootstrap-vue';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(BootstrapVue);
localVue.use(BootstrapVueIcons);

let store;
let wrapper;
const noOpGetters = {
  'users/selectedAgency': () => {},
  'tenants/tenants': () => [],
};
const noOpActions = {
  'tenants/fetchTenants': () => {},
};
afterEach(() => {
  store = undefined;
  wrapper = undefined;
});

describe('OrganizationsView.vue', () => {
  describe('when the view is loaded', () => {
    beforeEach(() => {
      store = new Vuex.Store({
        getters: {
          ...noOpGetters,
        },
        actions: {
          ...noOpActions,
        },
      });
      wrapper = shallowMount(OrganizationsView, {
        store,
        localVue,
        computed: {
          newTerminologyEnabled: () => true,
        },
      });
    });
    it('should show the Organizations heading', () => {
      const heading = wrapper.find('h2');
      expect(heading.text()).toEqual('Organizations');
    });
  });
});
