// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyReleaseSigning } = require('../plugins/withReleaseSigning');

const GENERATED = `apply plugin: "com.android.application"

android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
`;

describe('withReleaseSigning config plugin', () => {
  test('adds a release signing config fed by key/keystore.properties', () => {
    const out: string = applyReleaseSigning(GENERATED);
    expect(out).toContain('rootProject.file("../key/keystore.properties")');
    expect(out).toMatch(/signingConfigs \{\s*release \{/);
    expect(out).toContain(
      'signingConfig releaseKeystorePropsFile.exists() ? signingConfigs.release : signingConfigs.debug',
    );
  });

  test('keeps debug builds on the debug key', () => {
    const out: string = applyReleaseSigning(GENERATED);
    expect(out).toMatch(/debug \{\s*signingConfig signingConfigs\.debug\s*\}/);
  });

  test('is idempotent', () => {
    const once: string = applyReleaseSigning(GENERATED);
    expect(applyReleaseSigning(once)).toBe(once);
  });
});
