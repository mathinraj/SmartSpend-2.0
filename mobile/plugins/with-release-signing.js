const { withAppBuildGradle } = require('expo/config-plugins');

// Signs release builds with the keystore named in ~/.gradle/gradle.properties (never in the repo):
//   SPENDTRAK_RELEASE_STORE_FILE=/absolute/path/to/spendtrak-release.jks
//   SPENDTRAK_RELEASE_STORE_PASSWORD=...
//   SPENDTRAK_RELEASE_KEY_ALIAS=spendtrak
//   SPENDTRAK_RELEASE_KEY_PASSWORD=...
// Without them, release builds fall back to the public debug key and must not be published.
const SIGNING_CONFIG = `
        release {
            if (findProperty('SPENDTRAK_RELEASE_STORE_FILE')) {
                storeFile file(findProperty('SPENDTRAK_RELEASE_STORE_FILE'))
                storePassword findProperty('SPENDTRAK_RELEASE_STORE_PASSWORD')
                keyAlias findProperty('SPENDTRAK_RELEASE_KEY_ALIAS')
                keyPassword findProperty('SPENDTRAK_RELEASE_KEY_PASSWORD')
            }
        }`;

const RELEASE_SIGNING = `if (findProperty('SPENDTRAK_RELEASE_STORE_FILE')) {
                signingConfig signingConfigs.release
            } else {
                logger.warn('SpendTrak: no release keystore configured; signing with the debug key.')
                signingConfig signingConfigs.debug
            }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes('SPENDTRAK_RELEASE_STORE_FILE')) return config;

    const signingConfigs = /signingConfigs\s*\{/;
    const releaseBuildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!signingConfigs.test(gradle) || !releaseBuildType.test(gradle)) {
      throw new Error('with-release-signing: app/build.gradle no longer has the expected signing blocks.');
    }
    gradle = gradle.replace(signingConfigs, (match) => match + SIGNING_CONFIG);
    gradle = gradle.replace(releaseBuildType, (_, before) => before + RELEASE_SIGNING);
    config.modResults.contents = gradle;
    return config;
  });
};
