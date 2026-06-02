/**
 * Expo Config Plugin to enable cleartext (HTTP) traffic on Android.
 *
 * Android 9+ blocks HTTP by default in release builds. Since the backup server
 * may run on a local network without HTTPS, we need to explicitly allow it.
 *
 * This plugin:
 * 1. Adds android:networkSecurityConfig to AndroidManifest.xml
 * 2. Creates res/xml/network_security_config.xml allowing cleartext traffic
 */
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCleartextTraffic(config) {
  // Step 1: Add networkSecurityConfig attribute to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (application) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }

    return config;
  });

  // Step 2: Create the network_security_config.xml file
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      // Create directory if it doesn't exist
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext (HTTP) traffic for local network backup servers -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xmlContent);

      return config;
    },
  ]);

  return config;
}

module.exports = withCleartextTraffic;
