#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

import { loadRuntimeEnvInventory } from "./runtime-env-inventory.mjs";
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

function collectEnvKeys(envGroups, requiredInRuntime) {
  return uniqueSorted(
    envGroups.flatMap((group) => {
      if (group.required_in_runtime !== requiredInRuntime) {
        return [];
      }
      return group.keys;
    }),
  );
}

function collectPublicOriginEnvKeys(publicOrigin, requiredInRuntime) {
  if (!publicOrigin || publicOrigin.required_in_preflight !== requiredInRuntime) {
    return [];
  }
  return uniqueSorted(publicOrigin.env_keys ?? []);
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

function deriveServiceContract(topology, inventoryService, envInventoryService) {
  const topologyRef = topologyServiceRef(topology, inventoryService);
  const secretGroups = inventoryService.secret_groups ?? [];
  const publicOrigin = inventoryService.public_origin ?? null;
  const envGroups = envInventoryService?.env_groups ?? [];
  const requiredSecretKeys = collectSecretKeys(secretGroups, true);
  const optionalSecretKeys = collectSecretKeys(secretGroups, false);
  const requiredEnvKeys = uniqueSorted([
    ...collectEnvKeys(envGroups, true),
    ...collectPublicOriginEnvKeys(publicOrigin, true),
  ]);
  const optionalEnvKeys = uniqueSorted([
    ...collectEnvKeys(envGroups, false),
    ...collectPublicOriginEnvKeys(publicOrigin, false),
  ]);
  const allSecretKeys = uniqueSorted(
    secretGroups.flatMap((group) => group.keys ?? []),
  );
  const allEnvKeys = uniqueSorted([
    ...envGroups.flatMap((group) => group.keys ?? []),
    ...(publicOrigin?.env_keys ?? []),
  ]);

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
      required_env_keys: requiredEnvKeys,
      optional_env_keys: optionalEnvKeys,
      all_env_keys: allEnvKeys,
      required_secret_keys: requiredSecretKeys,
      optional_secret_keys: optionalSecretKeys,
      all_secret_keys: allSecretKeys,
      required_runtime_keys: uniqueSorted([
        ...requiredEnvKeys,
        ...requiredSecretKeys,
      ]),
      optional_runtime_keys: uniqueSorted([
        ...optionalEnvKeys,
        ...optionalSecretKeys,
      ]),
      all_runtime_keys: uniqueSorted([...allEnvKeys, ...allSecretKeys]),
    },
    secret_path_prefix: inventoryService.secret_path_prefix,
    rotation_sla_days: inventoryService.rotation_sla_days,
  };
}

export function deriveRuntimeEnvContracts({
  inventory = loadRuntimeSecretInventory(),
  envInventory = loadRuntimeEnvInventory(),
  topology = loadTopology(),
} = {}) {
  const envInventoryByServiceId = new Map(
    envInventory.services.map((service) => [service.service_id, service]),
  );

  return {
    contract_type: "runtime-env-contracts",
    schema_version: "1",
    generated_from: {
      runtime_secret_inventory: "docs/deployment/runtime-secrets-inventory.json",
      runtime_env_inventory: "docs/deployment/runtime-env-inventory.json",
      platform_topology: "infra/opentofu/platform-topology.json",
    },
    services: inventory.services
      .map((service) =>
        deriveServiceContract(
          topology,
          service,
          envInventoryByServiceId.get(service.service_id),
        ),
      )
      .sort((left, right) => left.service_id.localeCompare(right.service_id)),
  };
}

export async function stringifyRuntimeEnvContracts(payload) {
  return prettier.format(JSON.stringify(payload), { parser: "json" });
}

export { defaultOutputPath, defaultTopologyPath, loadTopology };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(
    await stringifyRuntimeEnvContracts(deriveRuntimeEnvContracts()),
  );
}
