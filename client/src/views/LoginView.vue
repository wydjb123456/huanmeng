<template>
  <div class="min-h-screen flex">
    <!-- 左侧艺术展示区：编辑式排版 -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <!-- 艺术主图（轮播） -->
      <transition name="art-fade" mode="out-in">
        <img
          :key="currentArtIndex"
          :src="currentArt.src"
          :alt="currentArt.title"
          class="absolute inset-0 w-full h-full object-cover ken-burns"
        />
      </transition>

      <!-- 双层渐变 -->
      <div class="absolute inset-0 bg-gradient-to-br from-ink-900/70 via-ink-900/30 to-ink-900/80"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-transparent to-ink-900/40"></div>

      <div class="relative flex flex-col justify-between p-12 w-full">
        <!-- 顶部：Logo + 编号 -->
        <div class="flex items-start justify-between">
          <router-link to="/" class="flex items-center gap-3 group w-fit">
            <img src="/logo.png" alt="幻梦" class="h-10 w-auto" />
            <span class="cal-cn text-3xl text-white tracking-wide">幻梦</span>
          </router-link>
          <div class="text-right text-white">
            <div class="editorial-number text-white/60 text-xs">Vol. 01</div>
            <div class="text-white/40 text-[10px] tracking-[0.3em] uppercase mt-1">A Visual Series</div>
          </div>
        </div>

        <!-- 中部：编辑式大标题 + 花体强调 -->
        <div class="max-w-md">
          <div class="flex items-center gap-3 text-white/60 text-xs tracking-[0.3em] uppercase mb-6">
            <span class="h-px w-10 bg-white/40"></span>
            <span>Where art begins</span>
          </div>
          <h1 class="display-hero text-white text-6xl xl:text-7xl mb-6">
            让想法<br/>
            化作<span class="script-accent text-8xl text-white">作品</span>
          </h1>
          <p class="text-white/70 leading-loose text-base font-light max-w-xs">
            每一次生成，<br/>都是一场艺术与科技的对话
          </p>
        </div>

        <!-- 底部：当前作品 + 指示器 -->
        <div class="flex items-end justify-between">
          <div class="text-white">
            <div class="editorial-number text-white/60 text-xs mb-1">Nº {{ String(currentArtIndex + 1).padStart(2, '0') }}</div>
            <div class="font-serif-cn text-xl">{{ currentArt.title }}</div>
            <div class="text-white/50 text-xs tracking-wide uppercase mt-1">{{ currentArt.style }}</div>
          </div>
          <div class="flex gap-2">
            <button
              v-for="(art, i) in artworks"
              :key="art.src"
              class="h-px transition-all duration-500"
              :class="currentArtIndex === i ? 'w-8 bg-white' : 'w-4 bg-white/30 hover:bg-white/60'"
              @click="currentArtIndex = i"
              :aria-label="`查看第 ${i + 1} 幅`"
            ></button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧表单区：编辑式 + 装饰侧栏 -->
    <div class="flex-1 flex relative bg-ink-50">
      <!-- 左侧装饰：纵向编号 + 小图列 -->
      <div class="hidden xl:flex flex-col justify-between items-center py-12 px-6 border-r border-ink-200/60 w-24">
        <!-- 顶部：纵向 Vol 标 -->
        <div class="flex flex-col items-center gap-3">
          <div class="editorial-number text-ink-400 text-xs" style="writing-mode: vertical-rl;">VOL. 01</div>
          <div class="h-12 w-px bg-ink-200"></div>
        </div>

        <!-- 中部：竖向小图列 -->
        <div class="flex flex-col gap-3">
          <div
            v-for="(art, i) in sideArts"
            :key="art.src"
            class="w-14 h-20 rounded-sm overflow-hidden bg-ink-100 transition-all duration-500 hover:scale-105 cursor-pointer relative group"
            :class="currentArtIndex === i ? 'ring-2 ring-ink-900 ring-offset-2 ring-offset-ink-50' : 'opacity-50 hover:opacity-100'"
            @click="currentArtIndex = i"
          >
            <img :src="art.src" :alt="art.title" class="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>

        <!-- 底部：日期/年份 -->
        <div class="flex flex-col items-center gap-2">
          <div class="h-12 w-px bg-ink-200"></div>
          <div class="editorial-number text-ink-400 text-xs" style="writing-mode: vertical-rl;">MMXXVI</div>
        </div>
      </div>

      <!-- 主表单区 -->
      <div class="flex-1 flex items-center justify-center px-6 sm:px-12 py-12 relative">
        <!-- 移动端 Logo -->
        <router-link to="/" class="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <img src="/logo.png" alt="幻梦" class="h-8 w-auto" />
          <span class="cal-cn text-xl text-ink-900">幻梦</span>
        </router-link>

        <!-- 右上角：当前作品名（呼应左侧艺术图） -->
        <div class="hidden sm:block absolute top-8 right-8 text-right">
          <div class="editorial-number text-ink-400 text-xs mb-1">Nº {{ String(currentArtIndex + 1).padStart(2, '0') }}</div>
          <div class="cal-cn text-lg text-ink-700">{{ currentArt.title }}</div>
          <div class="text-ink-400 text-[10px] tracking-[0.25em] uppercase mt-0.5">{{ currentArt.style }}</div>
        </div>

        <!-- 底部装饰：引文 -->
        <div class="hidden sm:block absolute bottom-8 left-8 right-8 flex items-center gap-4">
          <span class="h-px flex-1 bg-ink-200"></span>
          <span class="editorial-number text-ink-400 text-[10px] whitespace-nowrap">— Art meets intelligence —</span>
          <span class="h-px flex-1 bg-ink-200"></span>
        </div>

        <div class="w-full max-w-sm fade-slow">
          <!-- 顶部小标 -->
          <div class="flex items-center gap-3 text-ink-400 text-xs tracking-[0.3em] uppercase mb-8">
            <span class="h-px w-8 bg-ink-300"></span>
            <span>{{ isLogin ? 'Welcome Back' : 'Begin Your Journey' }}</span>
          </div>

          <!-- 切换标签：编辑式 — 底线指示 -->
          <div class="flex mb-8 border-b border-ink-200">
            <router-link to="/login" class="flex-1 py-3 text-center text-sm tracking-wide transition-all border-b-2 -mb-px" :class="isLogin ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-700'">
              登录
            </router-link>
            <router-link to="/register" class="flex-1 py-3 text-center text-sm tracking-wide transition-all border-b-2 -mb-px" :class="!isLogin ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-700'">
              注册
            </router-link>
          </div>

          <h2 class="display-hero text-ink-900 text-5xl mb-2">{{ isLogin ? '欢迎回来' : '创建账号' }}</h2>
          <p class="text-sm text-ink-500 mb-10">{{ isLogin ? '登录后继续创作' : '注册即送 50 积分，开启第一件作品' }}</p>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-2">用户名</label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                </svg>
                <input v-model="form.username" type="text" class="input-base pl-10" placeholder="3-20 位字符" />
              </div>
            </div>

            <!-- 邮箱（仅注册模式） -->
            <div v-if="!isLogin">
              <label class="block text-sm font-medium text-ink-700 mb-2">邮箱</label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="2"/>
                  <path d="M4 6l8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <input v-model="form.email" type="email" class="input-base pl-10" placeholder="用于接收验证码" />
              </div>
            </div>

            <!-- 验证码（仅注册模式） -->
            <div v-if="!isLogin">
              <label class="block text-sm font-medium text-ink-700 mb-2">验证码</label>
              <div class="flex gap-2">
                <input v-model="form.code" type="text" maxlength="6" class="input-base flex-1" placeholder="6 位数字" />
                <button
                  type="button"
                  class="px-4 py-2 text-sm border border-ink-200 hover:border-ink-900 hover:bg-ink-900 hover:text-white transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="codeSending || codeCountdown > 0"
                  @click="sendCode"
                >
                  <span v-if="codeCountdown > 0">{{ codeCountdown }}s 后重试</span>
                  <span v-else-if="codeSending">发送中...</span>
                  <span v-else>获取验证码</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-2">密码</label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2"/>
                </svg>
                <input v-model="form.password" :type="showPwd ? 'text' : 'password'" class="input-base pl-10 pr-10" placeholder="至少 6 位" />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600" @click="showPwd = !showPwd">
                  <svg v-if="!showPwd" class="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                  <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>

            <!-- 邀请码（选填，仅注册模式） -->
            <div v-if="!isLogin">
              <label class="block text-sm font-medium text-ink-700 mb-2">邀请码 <span class="text-ink-400 font-normal text-xs ml-1">(选填)</span></label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <input v-model="form.inviteCode" type="text" class="input-base pl-10" placeholder="填写邀请码可额外获赠 20 积分" />
              </div>
            </div>

            <button type="submit" class="w-full py-3.5 bg-ink-900 text-white text-sm tracking-[0.2em] uppercase hover:bg-ink-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2" :disabled="loading">
              <svg v-if="loading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
              <span>{{ isLogin ? '登录' : '注册' }}</span>
              <span v-if="!loading">→</span>
            </button>
          </form>

          <div class="flex items-center gap-3 mt-10 mb-6">
            <span class="h-px flex-1 bg-ink-200"></span>
            <span class="text-ink-400 text-xs tracking-widest">OR</span>
            <span class="h-px flex-1 bg-ink-200"></span>
          </div>

          <p class="text-center text-sm text-ink-500">
            {{ isLogin ? '还没有账号？' : '已有账号？' }}
            <router-link :to="isLogin ? '/register' : '/login'" class="text-primary-600 font-medium hover:text-primary-700 border-b border-primary-300 hover:border-primary-600 pb-0.5">
              {{ isLogin ? '立即注册' : '去登录' }}
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const showPwd = ref(false);
const codeSending = ref(false);
const codeCountdown = ref(0);
let codeTimer: ReturnType<typeof setInterval> | null = null;

const isLogin = computed(() => route.name === 'login');
const form = reactive({ username: '', password: '', email: '', code: '', inviteCode: '' });

const artworks = [
  { src: '/images/anime-landscape.webp', title: '田园牧歌', style: 'Pastoral Anime' },
  { src: '/images/watercolor-flowers.webp', title: '花海日落', style: 'Watercolor' },
  { src: '/images/starry-oil.webp', title: '星夜', style: 'Oil Painting' },
  { src: '/images/ukiyoe-wave.webp', title: '神奈川冲浪', style: 'Ukiyo-e' },
  { src: '/images/aurora-mountain.webp', title: '极光', style: 'Digital Painting' },
  { src: '/images/ink-wash-mountain.webp', title: '水墨山河', style: 'Ink Wash' },
  { src: '/images/impressionist-garden.webp', title: '花园印象', style: 'Impressionist' },
  { src: '/images/surreal-islands.webp', title: '悬浮之境', style: 'Surreal' },
  { src: '/images/watercolor-autumn.webp', title: '秋日林径', style: 'Watercolor' },
];

// 侧栏展示 3 张缩略图（随主图轮播而变化，形成"上一张/当前/下一张"的视觉）
const sideArts = computed(() => {
  const n = artworks.length;
  const i = currentArtIndex.value;
  return [
    artworks[(i - 1 + n) % n],
    artworks[i],
    artworks[(i + 1) % n],
  ];
});

const currentArtIndex = ref(0);
const currentArt = computed(() => artworks[currentArtIndex.value]);
let autoTimer: ReturnType<typeof setInterval> | null = null;

async function sendCode() {
  if (!form.email) {
    ElMessage.warning('请输入邮箱');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    ElMessage.warning('邮箱格式不正确');
    return;
  }
  codeSending.value = true;
  try {
    await request.post('/auth/send-code', { email: form.email });
    ElMessage.success('验证码已发送，请查收邮箱');
    codeCountdown.value = 60;
    codeTimer = setInterval(() => {
      codeCountdown.value--;
      if (codeCountdown.value <= 0 && codeTimer) {
        clearInterval(codeTimer);
        codeTimer = null;
      }
    }, 1000);
  } catch {
    // 错误由拦截器处理
  } finally {
    codeSending.value = false;
  }
}

async function handleSubmit() {
  if (isLogin.value) {
    if (!form.username || !form.password) {
      ElMessage.warning('请填写用户名和密码');
      return;
    }
  } else {
    if (form.username.length < 3 || form.password.length < 6) {
      ElMessage.warning('用户名至少 3 位，密码至少 6 位');
      return;
    }
    if (!form.email) {
      ElMessage.warning('请输入邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      ElMessage.warning('邮箱格式不正确');
      return;
    }
    if (form.code.length !== 6) {
      ElMessage.warning('请输入 6 位验证码');
      return;
    }
  }

  loading.value = true;
  try {
    if (isLogin.value) {
      const data: any = await request.post('/auth/login', { username: form.username, password: form.password });
      userStore.setToken(data.token);
      userStore.setUser(data.user);
      // 拉取最新用户信息（含真实余额）
      userStore.fetchUserInfo();
      ElMessage.success('登录成功');
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
    } else {
      await request.post('/auth/register', {
        username: form.username,
        password: form.password,
        email: form.email,
        code: form.code,
        inviteCode: form.inviteCode || undefined,
      });
      ElMessage.success('注册成功，请登录');
      router.push('/login');
    }
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  autoTimer = setInterval(() => {
    currentArtIndex.value = (currentArtIndex.value + 1) % artworks.length;
  }, 7000);
});

onUnmounted(() => {
  if (autoTimer) clearInterval(autoTimer);
  if (codeTimer) clearInterval(codeTimer);
});
</script>

<style scoped>
.art-fade-enter-active,
.art-fade-leave-active {
  transition: opacity 1.4s ease, transform 1.4s ease;
}
.art-fade-enter-from {
  opacity: 0;
  transform: scale(1.03);
}
.art-fade-leave-to {
  opacity: 0;
  transform: scale(1);
}
</style>
