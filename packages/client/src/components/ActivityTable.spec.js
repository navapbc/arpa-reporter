import {
  beforeEach, describe, it, expect,
} from 'vitest';
import { mount } from '@vue/test-utils';
import ActivityTable from '@/components/ActivityTable.vue';

let wrapper;

// TODO: investigate and un-skip (https://github.com/usdigitalresponse/usdr-gost/issues/3261)
describe.skip('ActivityTable.vue', () => {
  describe('when view is loaded', () => {
    beforeEach(() => {
      wrapper = mount(ActivityTable, {
        props: {
          grantsInterested: [],
          onRowSelected: () => {},
          onRowClicked: () => {},
        },
      });
    });

    it('displays information about interested grants', async () => {
      await wrapper.setProps({
        grantsInterested: [{
          created_at: '2024-06-16T00:00:00.000Z', name: 'Nava', status_code: 'Rejected', interested_name: 'Will Apply', agency_id: 0, title: 'Rejected Grant', grant_id: '666997', assigned_by: null, assigned_by_user_name: null,
        }, {
          created_at: '2024-06-15T00:00:00.000Z', name: 'Nava', status_code: 'Interested', interested_name: 'Will Apply', agency_id: 0, title: 'Test Grant 666999', grant_id: '666999', assigned_by: null, assigned_by_user_name: null,
        }, {
          created_at: '2024-06-20T00:00:00.000Z', name: 'Nava', status_code: null, interested_name: null, agency_id: 0, title: 'EAR Postdoctoral Fellowships', grant_id: '333334', assigned_by: 17, assigned_by_user_name: 'Nava Staff',
        }],
      });

      const text = wrapper.text();
      expect(text).toContain('Nava  rejected Rejected Grant');
      expect(text).toContain('Nava  is  interested  in Test Grant 666999');
      expect(text).toContain('Nava Staff shared  EAR Postdoctoral Fellowships with Nava');
    });
  });
});
