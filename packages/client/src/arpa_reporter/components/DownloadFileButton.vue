<template>
  <a
    :href="href"
    class="usdr-btn-primary ml-2"
    :class="small ? 'btn-sm' : 'btn'"
  >
    Download file
  </a>
</template>

<script>
import { apiURL } from '@/helpers/fetchApi';

export default {
  name: 'DownloadFileButton',
  props: {
    upload: {
      type: Object,
      required: true,
    },
    small: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    href() {
      return apiURL(`/api/uploads/${this.upload.id}/download`);
    },
  },
};
</script>

<!-- NOTE: This file was copied from src/components/DownloadFileButton.vue (git @ ada8bfdc98) in the arpa-reporter repo on 2022-09-23T20:05:47.735Z -->
