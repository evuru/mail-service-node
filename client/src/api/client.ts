import axios from 'axios';

// Read JWT token from persisted auth-store
const getToken = (): string => {
  try {
    const raw = localStorage.getItem('auth-store');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      if (parsed.state?.token) return parsed.state.token;
    }
  } catch {
    // ignore
  }
  return '';
};

// Read selected app API key from persisted app-store
const getApiKey = (): string => {
  try {
    const raw = localStorage.getItem('app-store');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { selectedApp?: { api_key?: string } } };
      if (parsed.state?.selectedApp?.api_key) return parsed.state.selectedApp.api_key;
    }
  } catch {
    // ignore
  }
  return '';
};

const client = axios.create({
  baseURL: '/v1',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;

  const apiKey = getApiKey();
  if (apiKey) config.headers['X-API-KEY'] = apiKey;

  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      (err.response?.data as { error?: string })?.error ||
      err.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default client;
