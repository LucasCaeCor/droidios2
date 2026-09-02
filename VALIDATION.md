# Validation

Validated before packaging:

- `package.json` parses successfully.
- Desktop GitHub Actions YAML parses successfully.
- Generated iOS workflow YAML parses successfully.
- 23 TypeScript/TSX source files transpile without syntax diagnostics using TypeScript 5.8.3.
- No real API keys/tokens are bundled.

Environment limitation during packaging:

- Full `npm install` could not complete in the artifact-generation environment because registry dependency download exceeded the available execution window. The repository includes a Windows GitHub Actions workflow that installs dependencies, runs `npm run typecheck`, builds, and publishes the Windows distributables. This workflow is the definitive integration/build check.
