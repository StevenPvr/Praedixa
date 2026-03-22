locals {
  topology = jsondecode(file("${path.module}/platform-topology.json"))

  required_platform_services = ["landing", "webapp", "admin", "api"]
  required_prod_services     = ["landing", "webapp", "admin", "api", "auth"]
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
