import { loadConfig } from "./config.js";
import { createAppServer } from "./server.js";
import { initializeDecisionConfigService } from "./services/decision-config.js";

const config = loadConfig(process.env);
await initializeDecisionConfigService(config.databaseUrl);
createAppServer(config);
