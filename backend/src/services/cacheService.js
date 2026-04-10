const inMemoryCache = new Map();

export const getCacheValue = (key) => {
  const item = inMemoryCache.get(key);

  if (!item) {
    return null;
  }

  if (item.expiresAt <= Date.now()) {
    inMemoryCache.delete(key);
    return null;
  }

  return item.value;
};

export const setCacheValue = (key, value, ttlMs = 1500) => {
  inMemoryCache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(100, ttlMs),
  });
};

export const clearCache = (prefix = "") => {
  if (!prefix) {
    inMemoryCache.clear();
    return;
  }

  for (const key of inMemoryCache.keys()) {
    if (key.startsWith(prefix)) {
      inMemoryCache.delete(key);
    }
  }
};
