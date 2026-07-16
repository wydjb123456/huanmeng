import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';

const instance = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = error.response?.data?.message || '网络错误，请稍后重试';
    if (Array.isArray(message)) {
      message = message.join('；');
    }
    if (error.response?.status === 401) {
      const userStore = useUserStore();
      userStore.logout();
      window.location.href = '/login';
    }
    ElMessage.error(message);
    return Promise.reject(error);
  }
);

export default instance;
