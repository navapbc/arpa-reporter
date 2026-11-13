<!-- Adding this at the top because the rule was still getting flagged when added next-line -->
<!-- eslint-disable vuejs-accessibility/no-autofocus -->
<template>
  <main>
    <b-card
      no-body
      tag="div"
      style="max-width: 26rem; margin-top: 11rem"
      class="mx-auto border-0"
    >
      <b-card-img
        :src="logo"
        style="max-width: 14rem"
        alt="United States Digital Response logo"
        class="mx-auto mb-3"
        top
      />
      <b-card-text class="mt-4 p-3 dropshadow-card">
        <h1 class="h3 my-4">
          Log in to Federal Grant Finder
        </h1>
        <p class="mb-4">
          Enter your email to receive a one-time login link.
        </p>
        <form @submit="login">
          <div>
            <!-- eslint-disable-next-line vuejs-accessibility/label-has-for  -->
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              class="form-control mb-4"
              name="email"
              placeholder="Email address"
              autofocus
            >
          </div>
          <div
            class="d-flex justify-content-center"
          >
            <b-button
              variant="primary"
              class="btn-block"
              type="Submit"
              @click="login"
            >
              Send me the link
            </b-button>
          </div>
        </form>
        <div
          v-if="serverResponse"
          class="mt-3"
          :class="{
            'alert alert-success': serverResponse.success,
            'alert alert-danger': !serverResponse.success,
          }"
        >
          {{ serverResponse.message }}
        </div>
        <div
          v-for="error of v$.$errors"
          :key="error.$uid"
          class="mt-3 alert alert-danger"
        >
          {{ error.$message }}
        </div>
      </b-card-text>
      <div>
        <div class="font-weight-bold">
          New features, simpler experience
        </div>
        <div>
          <span>Search real Grants.gov data with our redesigned search on Simpler.Grants.gov. Opportunities and your custom searches can be saved and shared. We're also developing new features to support managing your organization in the Simpler Workspace. </span>
          <a
            href="https://simpler.grants.gov/search"
            target="_blank"
            aria-label="link to Simpler Grants.gov search"
          >Check it out at Simpler Grants.gov.</a>
        </div>
        <div class="mt-3">
          <span class="font-weight-bold">Need help? </span><a href="mailto:grantfinder.helpdesk@navapbc.com?subject=Federal Grant Finder Login Issue">Contact Nava for support.</a>
        </div>
      </div>
    </b-card>
  </main>
</template>

<script>

import { useVuelidate } from '@vuelidate/core';
import { required, email, helpers } from '@vuelidate/validators';
import { apiURL } from '@/helpers/fetchApi';
import logo from '@/assets/usdr_logo_standard_wide.svg';

export default {
  name: 'LoginView',
  setup() {
    return { v$: useVuelidate() };
  },
  data() {
    const serverResponse = this.$route.query.message && {
      message: this.$route.query.message,
      success: false, // If message is present in the URL, it's because of an error (e.g., invalid token)
    };
    return {
      email: '',
      serverResponse,
      logo,
    };
  },
  validations: {
    email: {
      required: helpers.withMessage('Please enter an email address', required),
      email: helpers.withMessage('Please enter a valid email address', email),
    },
  },
  methods: {
    async login(event) {
      event.preventDefault();
      this.serverResponse = null;
      if (!(await this.v$.$validate())) {
        return;
      }
      this.v$.$reset();

      const body = JSON.stringify({
        email: this.email,
        redirect_to: this.$route.query.redirect_to || this.$router.resolve('/').href,
      });
      const headers = {
        'Content-Type': 'application/json',
      };
      fetch(apiURL('/api/sessions'), { method: 'POST', headers, body })
        .then((r) => {
          if (!r.ok) throw new Error(`login: ${r.statusText} (${r.status})`);
          return r;
        })
        .then((r) => r.json())
        .then((r) => {
          this.serverResponse = {
            message: r.message,
            success: r.success,
          };
        })
        .catch((error) => {
          this.serverResponse = {
            message: error.message
              || 'There was a problem at Nava. Try again in a minute or two, and if you still receive the same error, contact the Nava team.',
            success: false,
          };
        });
    },
  },
};
</script>
