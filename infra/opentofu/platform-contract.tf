locals {
  topology_path = coalesce(
    var.topology_path,
    "${path.module}/platform-topology.json",
  )
  topology = jsondecode(file(local.topology_path))

  required_platform_services = ["landing", "webapp", "admin", "api"]
  required_prod_services     = ["landing", "webapp", "admin", "api", "auth"]
  platform_service_contracts = {
    staging = {
      for service_name, environments in local.topology.platform.services :
      service_name => {
        service              = service_name
        environment          = "staging"
        region               = local.topology.region
        namespace_name       = try(environments.staging.namespace_name, null)
        container_name       = try(environments.staging.container_name, null)
        oidc_client_id       = try(environments.staging.oidc_client_id, null)
        public_hosts         = try(environments.staging.public_hosts, [])
        private_network_name = try(environments.staging.private_network_name, null)
        rdb_instance_name    = try(environments.staging.rdb_instance_name, null)
        scaling = {
          min_scale    = try(environments.staging.scaling.min_scale, null)
          max_scale    = try(environments.staging.scaling.max_scale, null)
          cpu_limit    = try(environments.staging.scaling.cpu_limit, null)
          memory_limit = try(environments.staging.scaling.memory_limit, null)
        }
      } if can(environments.staging)
    }
    prod = {
      for service_name, environments in local.topology.platform.services :
      service_name => {
        service              = service_name
        environment          = "prod"
        region               = local.topology.region
        namespace_name       = try(environments.prod.namespace_name, null)
        container_name       = try(environments.prod.container_name, null)
        oidc_client_id       = try(environments.prod.oidc_client_id, null)
        public_hosts         = try(environments.prod.public_hosts, [])
        private_network_name = try(environments.prod.private_network_name, null)
        rdb_instance_name    = try(environments.prod.rdb_instance_name, null)
        scaling = {
          min_scale    = try(environments.prod.scaling.min_scale, null)
          max_scale    = try(environments.prod.scaling.max_scale, null)
          cpu_limit    = try(environments.prod.scaling.cpu_limit, null)
          memory_limit = try(environments.prod.scaling.memory_limit, null)
        }
      } if can(environments.prod)
    }
  }
}

check "topology_schema_version" {
  assert {
    condition     = try(local.topology.schema_version, "") == "1"
    error_message = "platform-topology.json must declare schema_version=1."
  }
}

check "topology_region_present" {
  assert {
    condition     = try(length(local.topology.region) > 0, false)
    error_message = "platform-topology.json must declare a non-empty region."
  }
}

check "staging_platform_services_present" {
  assert {
    condition = alltrue([
      for service in local.required_platform_services :
      try(length(local.topology.platform.services[service].staging.namespace_name) > 0, false) &&
      try(length(local.topology.platform.services[service].staging.container_name) > 0, false)
    ])
    error_message = "Every staging platform service must declare namespace_name and container_name."
  }
}

check "prod_platform_services_present" {
  assert {
    condition = alltrue([
      for service in local.required_prod_services :
      try(length(local.topology.platform.services[service].prod.namespace_name) > 0, false) &&
      try(length(local.topology.platform.services[service].prod.container_name) > 0, false)
    ])
    error_message = "Every prod platform service must declare namespace_name and container_name."
  }
}

check "public_hosts_are_https" {
  assert {
    condition = alltrue(flatten([
      for service_name, environments in local.topology.platform.services : [
        for env_name, service in environments : alltrue([
          for host in try(service.public_hosts, []) :
          startswith(host, "https://")
        ])
      ]
    ]))
    error_message = "All declared public hosts must be HTTPS URLs."
  }
}

check "private_networks_declared_for_api_and_auth" {
  assert {
    condition = (
      try(length(local.topology.platform.services.api.staging.private_network_name) > 0, false) &&
      try(length(local.topology.platform.services.api.prod.private_network_name) > 0, false) &&
      try(length(local.topology.platform.services.auth.prod.private_network_name) > 0, false)
    )
    error_message = "API/Auth services must declare private_network_name."
  }
}

check "rdb_instances_declared_for_api_and_auth" {
  assert {
    condition = (
      try(length(local.topology.platform.services.api.staging.rdb_instance_name) > 0, false) &&
      try(length(local.topology.platform.services.api.prod.rdb_instance_name) > 0, false) &&
      try(length(local.topology.platform.services.auth.prod.rdb_instance_name) > 0, false)
    )
    error_message = "API/Auth services must declare rdb_instance_name."
  }
}

output "platform_topology" {
  value       = local.topology
  description = "Canonical declarative topology consumed by OpenTofu and Scaleway wrappers."
}

output "platform_service_contracts" {
  value       = local.platform_service_contracts
  description = "State-backed declarative contracts for every service/environment pair."
}

output "platform_targets" {
  value = {
    staging = {
      for service in local.required_platform_services :
      service => {
        region         = local.topology.region
        namespace_name = local.topology.platform.services[service].staging.namespace_name
        container_name = local.topology.platform.services[service].staging.container_name
      }
    }
    prod = {
      for service in local.required_prod_services :
      service => {
        region         = local.topology.region
        namespace_name = local.topology.platform.services[service].prod.namespace_name
        container_name = local.topology.platform.services[service].prod.container_name
      }
    }
  }
  description = "Platform targets rendered from the declarative topology catalog."
}
