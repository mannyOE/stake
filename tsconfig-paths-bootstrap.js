const tsConfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');

const baseUrl = './dist'; // This is the output directory configured in tsconfig
tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths,
});
