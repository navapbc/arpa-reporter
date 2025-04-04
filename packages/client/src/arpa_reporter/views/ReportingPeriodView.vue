<template>
  <div>
    <h1>Reporting Period</h1>

    <div
      v-if="reportingPeriod === null"
      class="spinner-grow text-primary"
      role="status"
    >
      <span class="sr-only">Loading...</span>
    </div>

    <div v-else>
      <StandardForm
        :key="formKey"
        :initial-record="reportingPeriod"
        :cols="cols"
        @save="onSave"
        @reset="onReset"
      />
    </div>
  </div>
</template>

<script>
import StandardForm from '@/arpa_reporter/components/StandardForm.vue';

import { post } from '@/arpa_reporter/store';

export default {
  components: {
    StandardForm,
  },
  data: () => ({ formKey: Date.now() }),
  computed: {
    reportingPeriodId() {
      return this.$route.params.id;
    },
    isNew() {
      return this.reportingPeriodId === 'new';
    },
    reportingPeriod() {
      if (this.isNew) return {};
      const fromStore = this.$store.state.reportingPeriods
        .find((p) => p.id === Number(this.reportingPeriodId));
      return fromStore || null;
    },
    cols() {
      return [
        { field: 'id', label: 'ID', readonly: true },
        { field: 'name', label: 'Period Name', required: true },
        {
          field: 'start_date', label: 'Reporting Period Start Date', required: true, inputType: 'date',
        },
        {
          field: 'end_date', label: 'Reporting Period End Date', required: true, inputType: 'date',
        },
        { field: 'template_filename', label: 'Upload Template Name', readonly: true },
      ];
    },
  },
  methods: {
    async onSave(updatedPeriod) {
      try {
        const result = await post('/api/reporting_periods', { reportingPeriod: updatedPeriod });
        if (result.error) throw new Error(result.error);

        const text = this.isNew
          ? `Period ${updatedPeriod.name} successfully created`
          : `Period ${updatedPeriod.name} successfully updated`;

        this.$store.commit('addAlert', {
          text,
          level: 'ok',
        });

        this.$store.dispatch('updateReportingPeriods');
        if (this.isNew) {
          return this.$router.push(`/reporting_periods/${result.reportingPeriod.id}`);
        }
      } catch (e) {
        this.$store.commit('addAlert', {
          text: `Error saving reporting period: ${e.message}`,
          level: 'err',
        });
      }
      return undefined;
    },
    onReset() {
      this.formKey = Date.now();
    },
  },
};
</script>

<!-- NOTE: This file was copied from src/views/ReportingPeriod.vue (git @ ada8bfdc98) in the arpa-reporter repo on 2022-09-23T20:05:47.735Z -->
