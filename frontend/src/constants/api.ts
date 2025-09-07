// API Configuration
export const BASE_URL = import.meta.env.VITE_API_BASE_URL
export const REGISTER_ENDPOINT = `${BASE_URL}/api/auth/register`;
export const LOGIN_ENDPOINT = `${BASE_URL}/api/auth/login`;
export const REFRESH_ENDPOINT = `${BASE_URL}/api/auth/refresh`;
export const PROFILE_ENDPOINT = `${BASE_URL}/api/user/profile`;
export const DELETE_ACCOUNT_ENDPOINT = `${BASE_URL}/api/user/account`;
export const PREFERENCES_ENDPOINT = `${BASE_URL}/api/user/account`;
