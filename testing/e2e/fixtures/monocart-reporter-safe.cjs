const os = require("os");

function safeCall(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const fallbackCpu = [
  {
    model: "unknown",
    speed: 0,
    times: {
      user: 0,
      nice: 0,
      sys: 0,
      idle: 1,
      irq: 0,
    },
  },
];

const originalCpus = os.cpus.bind(os);
os.cpus = () => {
  const cpus = safeCall(originalCpus, fallbackCpu);
  if (Array.isArray(cpus) && cpus.length > 0 && cpus[0]) return cpus;
  return fallbackCpu;
};

const originalUptime = os.uptime.bind(os);
os.uptime = () => safeCall(originalUptime, 0);

const originalVersion = os.version.bind(os);
os.version = () => safeCall(originalVersion, "unknown");

const originalFreemem = os.freemem.bind(os);
os.freemem = () => safeCall(originalFreemem, 0);

const originalTotalmem = os.totalmem.bind(os);
os.totalmem = () => safeCall(originalTotalmem, 0);

const originalHostname = os.hostname.bind(os);
os.hostname = () => safeCall(originalHostname, "unknown");

module.exports = require("monocart-reporter");
