const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutes

const clearExpiredCache = () => {
  try {
    const now = Date.now();
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('spotify-api:')) {
        const item = JSON.parse(sessionStorage.getItem(key));
        if (now - item.timestamp > CACHE_EXPIRATION) {
          sessionStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};

const getFromSessionStorage = (key) => {
  try {
    clearExpiredCache();
    const item = sessionStorage.getItem(key);
    if (!item) return null;
    
    const parsedItem = JSON.parse(item);
    if (Date.now() - parsedItem.timestamp > CACHE_EXPIRATION) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsedItem;
  } catch (error) {
    console.error('Error retrieving from session storage:', error);
    return null;
  }
};

const saveToSessionStorage = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error saving to session storage:', error);
  }
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (response.ok && data.status === 'success') {
    return data;
  }
  throw new Error(data.message || 'Something went wrong');
};

const createRequest = async (endpoint, options = {}) => {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
  });
  
  return handleResponse(response);
};

export const api = {
  get: (endpoint, params = {}) => {
    console.log('api.get', endpoint, params);
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    const cacheKey = `spotify-api:${url}`;
    
    const cachedData = getFromSessionStorage(cacheKey);
    if (cachedData) {
      return Promise.resolve(cachedData.data);
    }
    
    const promise = createRequest(url, { method: 'GET' })
      .then(data => {
        saveToSessionStorage(cacheKey, data);
        return data;
      });
    
    return promise;
  },

  post: (endpoint, data = null) => {
    return createRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  },
};