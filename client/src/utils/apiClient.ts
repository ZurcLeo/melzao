const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com';

let tokenExpiredCallback: (() => void) | null = null;

export const setTokenExpiredCallback = (callback: () => void) => {
  tokenExpiredCallback = callback;
};

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle token expiration
      if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'INVALID_TOKEN') {
        console.warn('🔐 Token expirado ou inválido, limpando sessão');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');

        if (tokenExpiredCallback) {
          tokenExpiredCallback();
        }
      }

      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};