const STORAGE_KEY = "ai_queue_my_token";

export const saveMyToken = (token) => {
  if (!token) {
    return;
  }

  const payload = {
    tokenNumber: token.tokenNumber,
    tokenId: token._id,
    displayToken: token.displayToken,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const readMyToken = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const clearMyToken = () => {
  localStorage.removeItem(STORAGE_KEY);
};
