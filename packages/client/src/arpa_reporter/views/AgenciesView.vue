<template>
  <div>
    <h1>Agencies</h1>

    <div class="mb-4">
      <router-link
        to="/agencies/new"
        class="btn usdr-btn-primary"
      >
        Create New Agency
      </router-link>
    </div>

    <div>
      <table
        v-if="agencies"
        class="table table-striped"
      >
        <thead>
          <tr>
            <th>Agency Code</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="agency in agencies"
            :key="agency.code"
          >
            <td>{{ agency.code }}</td>
            <td>{{ agency.name }}</td>
            <td>
              <router-link
                :to="`/agencies/${agency.id}`"
                class="btn btn-sm btn-secondary"
              >
                Edit
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AgenciesView',
  computed: {
    agencies() {
      return this.$store.state.agencies;
    },
  },
  async mounted() {
    this.$store.dispatch('updateAgencies');
  },
};
</script>

<!-- NOTE: This file was copied from src/views/Agencies.vue (git @ ada8bfdc98) in the arpa-reporter repo on 2022-09-23T20:05:47.735Z -->
