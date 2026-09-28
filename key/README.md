# Release signing key

This folder holds the Android release keystore. Only this README is committed;
everything else here is git-ignored.

- `mining-puzzle-release.jks`: the upload/release keystore (alias `mining-puzzle`)
- `keystore.properties`: the store/key passwords used by the build

`plugins/withReleaseSigning.js` reads `keystore.properties` during
`npx expo prebuild`, so a fresh `android/` folder is signed automatically:

```sh
npx expo prebuild --clean --platform android
cd android && ./gradlew clean bundleRelease   # AAB for Google Play
# or: ./gradlew assembleRelease               # APK
```

**Back up both files privately (password manager / secure drive).** If they are
lost you can no longer publish updates to the same Play Store listing.
