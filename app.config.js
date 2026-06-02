// Dynamic Expo config that changes package name based on APP_ENV
// This allows dev and preview/prod builds to coexist on the same device

const IS_PREVIEW = process.env.APP_ENV === 'preview';
const IS_PRODUCTION = process.env.APP_ENV === 'production';

const getAppName = () => {
  if (IS_PREVIEW) return 'GG Economy (Preview)';
  if (IS_PRODUCTION) return 'GG Economy';
  return 'GG Economy (Dev)';
};

const getAndroidPackage = () => {
  if (IS_PRODUCTION) return 'com.ggeconomy.mobile';
  if (IS_PREVIEW) return 'com.ggeconomy.mobile.preview';
  return 'com.ggeconomy.mobile.dev';
};

const getIosBundleId = () => {
  if (IS_PRODUCTION) return 'com.ggeconomy.mobile';
  if (IS_PREVIEW) return 'com.ggeconomy.mobile.preview';
  return 'com.ggeconomy.mobile.dev';
};

module.exports = ({ config }) => {
  return {
    ...config,
    name: getAppName(),
    android: {
      ...config.android,
      package: getAndroidPackage(),
    },
    ios: {
      ...config.ios,
      bundleIdentifier: getIosBundleId(),
    },
  };
};
