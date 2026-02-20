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
  ],
  options: {
    doNotFollow: {
      path: ["node_modules", ".next", "dist", "build", "coverage", "playwright-report", "test-results"],
    },
    exclude: {
      path: ["node_modules", "\\.next", "dist", "build", "coverage", "playwright-report", "test-results"],
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
