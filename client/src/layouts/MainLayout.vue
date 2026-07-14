<template>
  <div class="min-h-screen bg-ink-50">
    <!-- 顶部导航：编辑式 -->
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-ink-200/60">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <router-link to="/" class="flex items-center gap-3 group">
            <img src="/logo.png" alt="幻梦" class="h-8 w-auto transition-transform group-hover:rotate-3" />
            <span class="cal-cn text-2xl text-ink-900 tracking-wide">幻梦</span>
            <span class="hidden sm:inline-block editorial-number text-ink-400 text-xs ml-1">Vol.01</span>
          </router-link>

          <!-- 桌面端导航：极简文字链接 -->
          <nav class="hidden md:flex items-center gap-7">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="group relative text-sm tracking-wide text-ink-600 hover:text-ink-900 transition-colors"
              active-class="text-ink-900"
            >
              {{ item.label }}
              <span
                class="absolute -bottom-1 left-0 h-px bg-ink-900 transition-all duration-300"
                :class="$route.path === item.path ? 'w-full' : 'w-0 group-hover:w-full'"
              ></span>
            </router-link>
          </nav>

          <!-- 右侧操作：极简 -->
          <div class="flex items-center gap-4">
            <template v-if="userStore.isLoggedIn">
              <!-- 生成进度指示器 -->
              <div
                v-if="worksStore.isActive"
                class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 cursor-pointer hover:bg-primary-100 transition-colors"
                @click="goToActiveWork"
                title="点击查看生成进度"
              >
                <svg class="w-4 h-4 text-primary-600 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
                <span class="text-xs text-primary-700 font-medium">{{ worksStore.activeWork?.type === 'poster' ? '海报' : 'PPT' }} {{ worksStore.activeWork?.progress }}%</span>
              </div>

              <!-- 签到与邀请福利 -->
              <button
                class="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-ink-200 rounded-sm hover:border-ink-900 hover:bg-ink-50 transition-all text-ink-600 hover:text-ink-900"
                @click="rewardsVisible = true"
                title="签到与邀请奖励"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                <span class="text-sm tracking-wide">福利</span>
              </button>

              <!-- 收费 & 积分 二合一入口 -->
              <button
                class="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-ink-200 rounded-sm hover:border-ink-900 hover:bg-ink-50 transition-all group"
                @click="pricingVisible = true"
                title="收费标准 & 兑换积分"
              >
                <svg class="w-4 h-4 text-primary-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span class="text-sm font-semibold text-ink-900">{{ userStore.userInfo?.balance ?? 0 }}</span>
                <span class="text-xs text-ink-400">积分</span>
                <span class="hidden lg:inline-block w-px h-3 bg-ink-200 mx-0.5"></span>
                <span class="hidden lg:inline text-xs text-ink-500">收费</span>
                <svg class="w-3 h-3 text-ink-400 group-hover:text-ink-700 transition-colors" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>

              <el-dropdown trigger="click">
                <button class="flex items-center gap-2 text-ink-700 hover:text-ink-900 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center text-white text-sm font-semibold">
                    {{ (userStore.userInfo?.username || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <span class="hidden sm:block text-sm">{{ userStore.userInfo?.username }}</span>
                  <svg class="w-3 h-3 text-ink-400" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="rewardsVisible = true">
                      <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      每日福利
                    </el-dropdown-item>
                    <el-dropdown-item @click="pricingVisible = true">
                      <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      收费 & 兑换积分
                    </el-dropdown-item>
                    <el-dropdown-item @click="$router.push('/works')">
                      <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                      我的作品
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleLogout">
                      <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                      退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>

            <template v-else>
              <button
                class="hidden lg:block text-sm tracking-wide text-ink-600 hover:text-ink-900 transition-colors"
                @click="pricingVisible = true"
              >
                收费
              </button>
              <router-link to="/login" class="hidden sm:block text-sm text-ink-600 hover:text-ink-900 tracking-wide transition-colors">
                登录
              </router-link>
              <router-link to="/register" class="text-sm text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-2 inline-flex items-center gap-1.5 transition-all tracking-wide">
                免费注册
                <span class="text-xs">→</span>
              </router-link>
            </template>

            <!-- 移动端菜单按钮 -->
            <button class="md:hidden p-1.5 text-ink-700 hover:text-ink-900" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="菜单">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <!-- 移动端菜单 -->
        <transition name="slide-down">
          <nav v-if="mobileMenuOpen" class="md:hidden py-3 border-t border-ink-200/60 space-y-1">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="block py-2 text-sm text-ink-700 hover:text-ink-900"
              @click="mobileMenuOpen = false"
            >
              {{ item.label }}
            </router-link>
            <button
              class="block py-2 text-sm text-ink-700 hover:text-ink-900 w-full text-left"
              @click="mobileMenuOpen = false; rewardsVisible = true"
              v-if="userStore.isLoggedIn"
            >
              每日福利
            </button>
            <button
              class="block py-2 text-sm text-ink-700 hover:text-ink-900 w-full text-left"
              @click="mobileMenuOpen = false; pricingVisible = true"
            >
              收费 & 兑换积分
            </button>
          </nav>
        </transition>
      </div>
    </header>

    <!-- 主内容区 -->
    <main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </transition>
      </router-view>
    </main>

    <!-- 收费标准窗口（含余额展示 + 兑换码） -->
    <PricingDialog v-model="pricingVisible" />

    <!-- 每日福利窗口 -->
    <RewardsDialog v-model="rewardsVisible" />

    <!-- 页脚：编辑式极简 -->
    <footer class="border-t border-ink-200 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-6 h-6 bg-ink-900"></div>
              <span class="cal-cn text-2xl text-ink-900">幻梦</span>
            </div>
            <p class="text-sm text-ink-500 max-w-md">让每一页都成为艺术品 — AI 智能创作平台</p>
          </div>
          <div class="text-right">
            <div class="editorial-number text-ink-400 text-xs mb-1">— Fin —</div>
            <button class="text-xs text-ink-400 hover:text-ink-700 transition-colors mb-1" @click="pricingVisible = true">
              收费 & 兑换积分
            </button>
            <p class="text-xs text-ink-400">© 2026 幻梦 · 视觉作品集</p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useWorksStore } from '@/stores/works';
import PricingDialog from '@/components/PricingDialog.vue';
import RewardsDialog from '@/components/RewardsDialog.vue';

const userStore = useUserStore();
const worksStore = useWorksStore();
const router = useRouter();
const mobileMenuOpen = ref(false);

// 收费标准 & 兑换积分 二合一窗口
const pricingVisible = ref(false);
// 每日福利窗口
const rewardsVisible = ref(false);

function goToActiveWork() {
  const aw = worksStore.activeWork;
  if (!aw) return;
  if (aw.type === 'poster') {
    router.push('/poster');
  } else {
    router.push('/generate');
  }
}

const navItems = computed(() => {
  const base = [
    { path: '/', label: '首页' },
    { path: '/templates', label: '画廊' },
    { path: '/generate', label: 'PPT' },
    { path: '/poster', label: '海报' },
    { path: '/word', label: '文档' },
    { path: '/works', label: '作品' },
  ];
  if (userStore.isAdmin) {
    base.push({ path: '/admin', label: '管理后台' });
  }
  return base;
});

function handleLogout() {
  userStore.logout();
  router.push('/');
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
