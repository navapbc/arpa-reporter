import {
  describe, beforeEach, afterEach, it, expect, vi,
} from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';
import UploadsView from '@/arpa_reporter/views/UploadsView.vue';

const baseState = {
  agencies: [],
  allUploads: [],
};

const baseActions = {
  updateUploads: vi.fn(),
  updateAgencies: vi.fn(),
};

const baseGetters = {
  periodNames: () => ['September, 2020', 'December, 2020'],
  agencyName: () => () => 'Test Agency',
};

let store;
let wrapper;

afterEach(() => {
  store = undefined;
  wrapper = undefined;
  vi.clearAllMocks();
});

// TODO: Investigate and un-skip (https://github.com/usdigitalresponse/usdr-gost/issues/3260)
describe('UploadsView.vue', () => {
  describe('when viewing a closed (non-current) reporting period', () => {
    beforeEach(() => {
      store = createStore({
        state: baseState,
        getters: {
          ...baseGetters,
          viewPeriodIsCurrent: () => false,
        },
        actions: baseActions,
      });
      wrapper = shallowMount(UploadsView, {
        global: {
          plugins: [store],
          stubs: ['router-link'],
        },
      });
    });

    it('should not show the Submit Workbook button', () => {
      const submitWorkbookLink = wrapper.find('[to="/new_upload"]');
      expect(submitWorkbookLink.exists()).toBe(false);
    });

    it('renders the uploads table', () => {
      expect(wrapper.text()).toContain('Uploads');
    });
  });

  describe('when viewing the current (open) reporting period', () => {
    beforeEach(() => {
      store = createStore({
        state: baseState,
        getters: {
          ...baseGetters,
          viewPeriodIsCurrent: () => true,
        },
        actions: baseActions,
      });
      wrapper = shallowMount(UploadsView, {
        global: {
          plugins: [store],
          stubs: ['router-link'],
        },
      });
    });

    it('should show the Submit Workbook button', () => {
      const submitWorkbookLink = wrapper.find('[to="/new_upload"]');
      expect(submitWorkbookLink.exists()).toBe(true);
    });

    it('renders the uploads table', () => {
      expect(wrapper.text()).toContain('Uploads Submit Workbook');
    });
  });

  it('renders with data and defaults to descending sorting', async () => {
    const date = new Date();
    store = createStore({
      state: {
        agencies: [],
        allUploads: [{
          agency_code: 'Nava',
          agency_id: 0,
          created_at: new Date().toISOString(),
          created_by: 'test@navapbc.com',
          ec_code: '0',
          filename: 'TEST_UPLOAD.xlsm',
          id: '00000000-0000-0000-0000-000000000000',
          notes: null,
          reporting_period_id: 64,
          tenant_id: 1,
          user_id: 1,
          validated_at: date.toISOString(),
          validated_by: 1,
        }, {
          agency_code: 'Nava',
          agency_id: 0,
          created_at: new Date().toISOString(),
          created_by: 'test@navapbc.com',
          ec_code: '0',
          filename: 'TEST_UPLOAD_1.xlsm',
          id: '11111111-1111-1111-1111-111111111111',
          notes: null,
          reporting_period_id: 64,
          tenant_id: 1,
          user_id: 1,
          validated_at: new Date(date.getTime() + 1000 * 60 * 60).toISOString(),
          validated_by: 1,
        }],
      },
      getters: {
        ...baseGetters,
        viewPeriodIsCurrent: () => true,
      },
      actions: baseActions,
    });

    wrapper = shallowMount(UploadsView, {
      global: {
        plugins: [store],
        stubs: ['router-link'],
      },
    });
    expect(wrapper.text()).toContain('Uploads Submit Workbook');

    // const validatedCol = wrapper.find('#vgt-table').findAll('th').at(6);
    const t = wrapper.findComponent({ ref: 'uploadsTable' });

    // table sorting doesn't happen until the next tick. this can be found in the
    // good table test cases
    // https://github.com/xaksis/vue-good-table/blob/master/test/unit/specs/Table.spec.js#L78
    await wrapper.vm.$nextTick();
    await t.vm.$nextTick();
    const tableHtml = t.html();
    expect(tableHtml.indexOf('11111111') < tableHtml.indexOf('00000000')).toBe(false);
  });
});

// NOTE: This file was copied from tests/unit/views/Uploads.spec.js (git @ ada8bfdc98) in the arpa-reporter repo on 2022-09-23T20:05:47.735Z
