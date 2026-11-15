const { getStorageConfig, validateR2Config } = require('./storageConfig');
const R2StorageProvider = require('./r2StorageProvider');
const LocalStorageProvider = require('./localStorageProvider');

let cachedR2Provider = null;
let cachedLocalProvider = null;
let customStorageProvider = null;

function setCustomStorageProvider(provider) {
  customStorageProvider = provider;
}

function getStorageProvider(overrideProvider) {
  if (customStorageProvider) {
    return customStorageProvider;
  }
  const config = getStorageConfig();
  const providerType = overrideProvider || config.provider;

  if (providerType === 'r2') {
    validateR2Config(config);
    if (!cachedR2Provider) {
      cachedR2Provider = new R2StorageProvider(config.r2);
    }
    return cachedR2Provider;
  }

  if (!cachedLocalProvider) {
    cachedLocalProvider = new LocalStorageProvider();
  }
  return cachedLocalProvider;
}

function resetStorageProviderCache() {
  cachedR2Provider = null;
  cachedLocalProvider = null;
  customStorageProvider = null;
}

module.exports = {
  getStorageProvider,
  setCustomStorageProvider,
  resetStorageProviderCache,
  getStorageConfig,
  validateR2Config,
};
