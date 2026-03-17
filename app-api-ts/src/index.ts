import { loadConfig } from "./config.js";
import { createAppServer } from "./server.js";
import { initializeDecisionConfigService } from "./services/decision-config.js";
import { initializeDecisionContractRuntimeService } from "./services/decision-contract-runtime.js";

const config = loadConfig(process.env);
await initializeDecisionConfigService(config.databaseUrl);
await initializeDecisionContractRuntimeService(config.databaseUrl);
createAppServer(config);
