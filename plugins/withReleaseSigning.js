/**
 * Expo config plugin: signs Android release builds with key/keystore.properties.
 *
 * `npx expo prebuild --clean` regenerates android/, so the signing config is
 * injected here instead of edited by hand. When key/keystore.properties is
 * missing (e.g. CI without secrets), release builds fall back to the debug key.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @mining-puzzle release-signing';

const PROPS_LOADER = `${MARKER}
def releaseKeystorePropsFile = rootProject.file("../key/keystore.properties")
def releaseKeystoreProps = new Properties()
if (releaseKeystorePropsFile.exists()) {
    releaseKeystorePropsFile.withInputStream { releaseKeystoreProps.load(it) }
}
`;

const RELEASE_SIGNING_CONFIG = `
        release {
            if (releaseKeystorePropsFile.exists()) {
                storeFile rootProject.file("../key/" + releaseKeystoreProps['storeFile'])
                storePassword releaseKeystoreProps['storePassword']
                keyAlias releaseKeystoreProps['keyAlias']
                keyPassword releaseKeystoreProps['keyPassword']
            }
        }`;

function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  // 1. Load key/keystore.properties before the android { } block.
  gradle = gradle.replace(/^android\s*\{/m, `${PROPS_LOADER}\nandroid {`);

  // 2. Add signingConfigs.release next to the generated debug config.
  gradle = gradle.replace(/signingConfigs\s*\{/, (match) => `${match}${RELEASE_SIGNING_CONFIG}`);

  // 3. Point buildTypes.release at it (debug key only when no keystore is present).
  const releaseBlock = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBlock.test(gradle)) {
    throw new Error('withReleaseSigning: could not find buildTypes.release signingConfig in app/build.gradle');
  }
  gradle = gradle.replace(
    releaseBlock,
    '$1signingConfig releaseKeystorePropsFile.exists() ? signingConfigs.release : signingConfigs.debug',
  );
  return gradle;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
