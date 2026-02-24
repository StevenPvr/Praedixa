import { loadConfig } from "./config.js";
import { createAppServer } from "./server.js";

const config = loadConfig(process.env);
createAppServer(config);
