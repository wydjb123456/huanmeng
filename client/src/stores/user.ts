import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import request from '@/api/request';

export interface UserInfo {
  id: number;
  username: string;
  balance: number;
  role: 'USER' | 'ADMIN';
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '');
  const userInfo = ref<UserInfo | null>(null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => userInfo.value?.role === 'ADMIN');

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  }

  function setUser(info: UserInfo) {
    userInfo.value = info;
  }

  async function fetchUserInfo() {
    if (!token.value) return;
    try {
      const data = (await request.get('/auth/me')) as UserInfo;
      setUser(data);
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = '';
    userInfo.value = null;
    localStorage.removeItem('token');
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    setToken,
    setUser,
    fetchUserInfo,
    logout,
  };
});
