# nest-link-app

## Production builds (EAS)

The repository now includes an `eas.json` profile that defines the production build we use for store submissions.

1. Install or use the EAS CLI (`npm install -g eas-cli` or `npx eas`).
2. Initialize/link the Expo project and make sure `expo.extra.eas.projectId` in `app.json` matches the project ID that `npx eas init` prints.
3. Run `npm run build:android` or `npm run build:ios` to create production artifacts through EAS.
4. When the build completes, you can submit it directly from the CLI with `npm run submit:android` / `npm run submit:ios` or use the generated download URL in the EAS dashboard.

See the [EAS build docs](https://docs.expo.dev/build/introduction/) if you need to create new credentials or configure store submissions.
