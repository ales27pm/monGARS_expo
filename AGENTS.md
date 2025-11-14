# Agent Instructions

- Do **not** manually edit the iOS build number in `app.json` or the Xcode project. Use the automation in `scripts/set-ios-build-number.cjs` (run automatically via the EAS build hook) and modify that script if the strategy needs to change.
- Always run `npx prettier --write` on any JSON, JavaScript, TypeScript, or Markdown files you modify, and run `npm run lint` before committing.
- Keep automation scripts free of placeholder logic—ensure they produce production-ready outputs with robust error handling and clear logging.
