import axios, { InternalAxiosRequestConfig, AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
});

// Получаем CSRF-токен из куки
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf_token='))
          ?.split('=')[1];
        
        if (csrfToken) {
          config.headers['X-CSRFToken'] = csrfToken;
        }
      }
      return config;
    });
  
  export default api;