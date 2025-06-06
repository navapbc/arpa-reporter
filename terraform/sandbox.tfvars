// unfortunately, nava-gost-sandbox creates some name prefixes that are too long
// down the pipe, so had to shorten it
namespace = "nava-gost-sand"
env       = "sandbox"

// Common
ssm_service_parameters_path_prefix    = "/gost/sandbox"
ssm_deployment_parameters_path_prefix = "/gost/sandbox/deploy-config"

// Datadog provider
datadog_draft            = true
datadog_api_url          = "https://api.us5.datadoghq.com/"
datadog_monitors_enabled = false

// Website
website_enabled           = true
website_domain_name       = "sandbox.nava-grants-sandbox.com"
website_managed_waf_rules = {}
website_feature_flags = {
  newTerminologyEnabled      = false,
  newGrantsDetailPageEnabled = true,
}

// ECS Cluster
cluster_container_insights_enabled = false

// API / Backend
api_enabled                            = true
api_container_image_tag                = "latest"
api_default_desired_task_count         = 1
api_minumum_task_count                 = 1
api_maximum_task_count                 = 5
api_enable_new_team_terminology        = false
api_enable_saved_search_grants_digest  = false
api_enable_grant_digest_scheduled_task = false
api_log_retention_in_days              = 7

// Postgres
postgres_enabled                   = true
postgres_prevent_destroy           = true
postgres_snapshot_before_destroy   = false
postgres_apply_changes_immediately = true
postgres_ca_cert_identifier        = "rds-ca-rsa2048-g1"

// Consume Grants
consume_grants_source_event_bus_name = "default"

// Email
email_enable_tracking = false
