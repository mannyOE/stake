export default [
    {
      ignores: ["node_modules", "dist"], // Add paths to ignore
    },
    {
      rules: {
        "no-unused-vars": "warn",
        "no-console": "off",
      },
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  ];
  