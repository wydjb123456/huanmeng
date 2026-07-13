import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'generate',
          name: 'generate',
          component: () => import('@/views/GenerateView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'poster',
          name: 'poster',
          component: () => import('@/views/PosterView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'word',
          name: 'word',
          component: () => import('@/views/WordView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'templates',
          name: 'templates',
          component: () => import('@/views/TemplatesView.vue'),
        },
        {
          path: 'works',
          name: 'works',
          component: () => import('@/views/WorksView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/views/AdminView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
});

router.beforeEach((to) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return { name: 'home' };
  }
});

router.afterEach(() => {
  window.scrollTo(0, 0);
});

export default router;
