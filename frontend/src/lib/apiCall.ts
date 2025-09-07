import { useAuthStore } from "../store/auth";



export const apiCall = async (url: string, options: RequestInit = {}): Promise<any> => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = useAuthStore.getState().token;
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout();
        return data
      }
      
      if (response.status === 422) {
        throw new Error(data.message || 'Validation failed');
      }
      
      if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};