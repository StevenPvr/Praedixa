import { loadConfig } from "./config.js";
import { startServer } from "./server.js";

const config = loadConfig(process.env);
startServer(config);
