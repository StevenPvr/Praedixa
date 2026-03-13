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
      name: "landing-cannot-import-webapp-or-admin",
      severity: "error",
      from: { path: "^app-landing/" },
      to: { path: "^app-(webapp|admin)/" },
    },
    {
      name: "webapp-cannot-import-landing-or-admin",
      severity: "error",
      from: { path: "^app-webapp/" },
      to: { path: "^app-(landing|admin)/" },
    },
    {
      name: "admin-cannot-import-landing-or-webapp",
      severity: "error",
      from: { path: "^app-admin/" },
      to: { path: "^app-(landing|webapp)/" },
    },
    {
      name: "frontend-apps-cannot-import-server-runtimes",
      severity: "error",
      from: { path: "^app-(landing|webapp|admin)/" },
      to: { path: "^app-(api-ts|connectors)/" },
    },
    {
      name: "api-ts-cannot-import-frontend-apps",
      severity: "error",
      from: { path: "^app-api-ts/" },
      to: { path: "^app-(landing|webapp|admin)/" },
    },
    {
      name: "connectors-cannot-import-app-runtimes",
      severity: "error",
      from: { path: "^app-connectors/" },
      to: { path: "^app-(landing|webapp|admin|api-ts)/" },
    },
    {
      name: "shared-packages-cannot-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^app-" },
    },
    {
      name: "shared-types-cannot-import-ui",
      severity: "error",
      from: { path: "^packages/shared-types/" },
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
        "\\.next",
        "\\.open-next",
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
