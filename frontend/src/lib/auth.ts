import { User } from '@/types';

const TOKEN_KEY = 'pixora_token';
const USER_KEY = 'pixora_user';

/** Decode the JWT exp claim (seconds) → ms timestamp. */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const saveAuth = (token: string, user: User): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Returns the token if it exists and has not expired.
 * Automatically clears storage and returns null when the token is expired.
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const expiry = getTokenExpiry(token);
  if (expiry !== null && Date.now() >= expiry) {
    clearAuth();
    return null;
  }
  return token;
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
};

export const isAuthenticated = (): boolean => !!getToken();
