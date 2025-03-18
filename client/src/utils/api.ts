
import { useAuth } from './auth';

export const createAuthHeaders = (token: string | null) => ({
  'Authorization': token ? `Bearer ${token}` : '',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const { token } = useAuth();
  const headers = createAuthHeaders(token);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('API request failed');
  }

  return response.json();
};
