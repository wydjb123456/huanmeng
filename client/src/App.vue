<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import router from '@/router';

const userStore = useUserStore();

onMounted(() => {
  if (userStore.token) {
    userStore.fetchUserInfo();
  }

  // 空闲时预加载所有路由组件，避免首次跳转时的加载延迟
  const preloadRoutes = () => {
    router.getRoutes().forEach((route) => {
      if (typeof route.components?.default === 'function') {
        (route.components.default as () => Promise<any>)().catch(() => {});
      }
    });
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadRoutes, { timeout: 3000 });
  } else {
    setTimeout(preloadRoutes, 1500);
  }
});
</script>
