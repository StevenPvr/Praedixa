#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadRuntimeSecretInventory } from "./validate-runtime-secret-inventory.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultTopologyPath = path.resolve(
  scriptDir,
  "../infra/opentofu/platform-topology.json",
);
const defaultOutputPath = path.resolve(
  scriptDir,
  "../docs/deployment/runtime-env-contracts.generated.json",
);

function loadTopology(topologyPath = defaultTopologyPath) {
  return JSON.parse(readFileSync(topologyPath, "utf8"));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function collectSecretKeys(secretGroups, requiredInPreflight) {
  return uniqueSorted(
    secretGroups.flatMap((group) => {
      if (group.required_in_preflight !== requiredInPreflight) {
        return [];
      }
      return group.keys;
    }),
  );
}

function topologyServiceRef(topology, inventoryService) {
  const { service, environment, container_name: containerName } =
    inventoryService;
  const platformService = topology?.platform?.services?.[service]?.[environment];
  if (platformService) {
    return {
      region: topology.region,
      namespace_name: platformService.namespace_name ?? inventoryService.namespace_name,
      container_name: platformService.container_name ?? containerName,
      public_hosts: platformService.public_hosts ?? [],
      private_network_name: platformService.private_network_name ?? null,
      rdb_instance_name: platformService.rdb_instance_name ?? null,
    };
  }

  const prospectService = topology?.prospects?.[service]?.[environment];
  if (prospectService) {
    return {
      region: topology.region,
      namespace_name: prospectService.namespace_name ?? inventoryService.namespace_name,
      container_name: prospectService.container_name ?? containerName,
      public_hosts: prospectService.public_hosts ?? [],
      private_network_name: prospectService.private_network_name ?? null,
      rdb_instance_name: prospectService.rdb_instance_name ?? null,
    };
  }

  return {
    region: topology.region,
    namespace_name: inventoryService.namespace_name,
    container_name: containerName,
    public_hosts: [],
    private_network_name: null,
    rdb_instance_name: null,
  };
}

function deriveServiceContract(topology, inventoryService) {
  const topologyRef = topologyServiceRef(topology, inventoryService);
  const secretGroups = inventoryService.secret_groups ?? [];
  const publicOrigin = inventoryService.public_origin ?? null;

  return {
    service_id: inventoryService.service_id,
    environment: inventoryService.environment,
    service: inventoryService.service,
    owner: inventoryService.owner,
    reviewers: inventoryService.reviewers ?? [],
    preflight_required: inventoryService.preflight_required === true,
    topology: {
      region: topologyRef.region,
      namespace_name: topologyRef.namespace_name,
      container_name: topologyRef.container_name,
      public_hosts: topologyRef.public_hosts,
      private_network_name: topologyRef.private_network_name,
      rdb_instance_name: topologyRef.rdb_instance_name,
    },
    runtime_contract: {
      public_origin:
        publicOrigin === null
          ? null
          : {
              expected_origin: publicOrigin.expected_origin,
              env_keys: uniqueSorted(publicOrigin.env_keys ?? []),
              required_in_preflight:
                publicOrigin.required_in_preflight === true,
            },
      required_secret_keys: collectSecretKeys(secretGroups, true),
      optional_secret_keys: collectSecretKeys(secretGroups, false),
      all_secret_keys: uniqueSorted(
        secretGroups.flatMap((group) => group.keys ?? []),
      ),
    },
    secret_path_prefix: inventoryService.secret_path_prefix,
    rotation_sla_days: inventoryService.rotation_sla_days,
  };
}

export function deriveRuntimeEnvContracts({
  inventory = loadRuntimeSecretInventory(),
  topology = loadTopology(),
} = {}) {
  return {
    contract_type: "runtime-env-contracts",
    schema_version: "1",
    generated_from: {
      runtime_secret_inventory: "docs/deployment/runtime-secrets-inventory.json",
      platform_topology: "infra/opentofu/platform-topology.json",
    },
    services: inventory.services
      .map((service) => deriveServiceContract(topology, service))
      .sort((left, right) => left.service_id.localeCompare(right.service_id)),
  };
}

export function stringifyRuntimeEnvContracts(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export { defaultOutputPath, defaultTopologyPath, loadTopology };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(
    stringifyRuntimeEnvContracts(deriveRuntimeEnvContracts()),
  );
}
