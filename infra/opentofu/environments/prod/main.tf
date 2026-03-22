terraform {
  required_version = ">= 1.5.7"
}

module "platform" {
  source = "../.."

  topology_path = abspath("${path.module}/../../platform-topology.json")
}

locals {
  environment       = "prod"
  service_contracts = module.platform.platform_service_contracts[local.environment]
}

resource "terraform_data" "service_contract" {
  for_each = local.service_contracts

  input = each.value
}

output "environment" {
  value       = local.environment
  description = "Environnement pilote par ce state."
}

output "service_contracts" {
  value = {
    for service_name, contract in terraform_data.service_contract :
    service_name => contract.output
  }
  description = "Contrats de service prod consommes par les wrappers et la CI."
}

output "platform_targets" {
  value       = module.platform.platform_targets[local.environment]
  description = "Cibles de release prod derivees du catalogue declaratif."
}

output "platform_topology" {
  value       = module.platform.platform_topology
  description = "Topologie canonique conservee dans le state prod."
}
