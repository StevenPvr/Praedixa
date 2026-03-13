/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "api-ts-cannot-import-frontend-apps",
      severity: "error",
      from: { path: "^app-api-ts/" },
      to: { path: "^app-(landing|webapp|admin)/" },
    },
    {
      name: "connectors-cannot-import-frontend-apps",
      severity: "error",
      from: { path: "^app-connectors/" },
      to: { path: "^app-(landing|webapp|admin)/" },
    },
    {
      name: "api-runtimes-cannot-import-each-other-directly",
      severity: "error",
      from: { path: "^app-api-ts/" },
      to: { path: "^app-connectors/" },
    },
    {
      name: "connectors-cannot-import-api-ts",
      severity: "error",
      from: { path: "^app-connectors/" },
      to: { path: "^app-api-ts/" },
    },
    {
      name: "shared-packages-cannot-import-app-runtimes",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^app-(api-ts|connectors|landing|webapp|admin)/" },
    },
    {
      name: "shared-types-cannot-import-ui",
      severity: "error",
      from: { path: "^packages/shared-types/" },
      to: { path: "^packages/ui/" },
    },
    {
      name: "api-runtimes-cannot-import-ui-package",
      severity: "error",
      from: { path: "^app-(api-ts|connectors)/" },
      to: { path: "^packages/ui/" },
    },
  ],
  options: {
    doNotFollow: {
      path: [
        "node_modules",
        ".next",
        ".open-next",
        "dist",
        "build",
        "coverage",
        "playwright-report",
        "test-results",
        "skolae",
        "centaurus",
      ],
    },
    exclude: {
      path: [
        "node_modules",
        String.raw`\.next`,
        String.raw`\.open-next`,
        "dist",
        "build",
        "coverage",
        "playwright-report",
        "test-results",
        "skolae",
        "centaurus",
      ],
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
