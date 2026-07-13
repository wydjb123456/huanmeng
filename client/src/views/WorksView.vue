<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- 页面标题：编辑式 -->
    <div v-reveal class="flex items-end justify-between mb-8 pb-6 border-b border-ink-200">
      <div>
        <div class="editorial-number text-primary-500 text-xs tracking-[0.3em] uppercase mb-3">— Archive —</div>
        <h1 class="display-hero text-ink-900 text-5xl sm:text-6xl mb-2">我的<span class="script-accent text-7xl text-ink-900">作品</span></h1>
        <p class="text-ink-500">查看、下载和管理你的生成作品</p>
      </div>
      <router-link :to="activeTab === 'ppt' ? '/generate' : '/poster'" class="hidden sm:inline-flex items-center gap-2 text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-4 transition-all text-sm tracking-wide">
        新建{{ activeTab === 'ppt' ? 'PPT' : '海报' }}
        <span>→</span>
      </router-link>
    </div>

    <!-- 类型切换 Tab -->
    <div class="flex items-center gap-6 mb-6">
      <button
        v-for="t in tabs"
        :key="t.value"
        class="editorial-number text-sm tracking-widest pb-2 border-b-2 transition-all"
        :class="activeTab === t.value ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-700'"
        @click="switchTab(t.value)"
      >{{ t.label }} <span class="text-xs ml-1">({{ t.count }})</span></button>
    </div>

    <!-- 存储配额 + 早下载提示 -->
    <div v-if="quota.max > 0" class="mb-8 p-5 bg-ink-50 border border-ink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-primary-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div>
          <p class="text-sm text-ink-800">
            作品存储 <span class="font-semibold text-ink-900">{{ quota.current }}</span> / {{ quota.max }}
            <span v-if="quota.current >= quota.max" class="ml-2 text-red-600 text-xs">已达上限，请删除旧作品后再生成</span>
            <span v-else-if="quota.current >= quota.max - 3" class="ml-2 text-amber-600 text-xs">即将达上限</span>
          </p>
          <p class="text-xs text-ink-500 mt-1">为节省服务器存储资源，请尽早下载作品到本地。作品长期保留可能因维护而被清理。</p>
        </div>
      </div>
      <div class="h-1.5 w-full sm:w-40 bg-ink-200 rounded-full overflow-hidden shrink-0">
        <div class="h-full transition-all duration-500" :class="quotaPercent >= 100 ? 'bg-red-500' : quotaPercent >= 85 ? 'bg-amber-500' : 'bg-primary-500'" :style="{ width: Math.min(100, quotaPercent) + '%' }"></div>
      </div>
    </div>


    <!-- 加载中 Skeleton -->
    <div v-if="loading" class="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
      <div v-for="i in 6" :key="i" class="break-inside-avoid">
        <div :class="i % 3 === 0 ? 'h-[420px]' : 'h-[280px]'" class="skeleton rounded-sm"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="works.length === 0" v-reveal class="py-32 text-center">
      <div class="editorial-number text-primary-400 text-sm mb-6">— Empty Canvas —</div>
      <h3 class="display-hero text-ink-900 text-4xl sm:text-5xl mb-3">还没有{{ activeTab === 'ppt' ? 'PPT' : '海报' }}作品</h3>
      <p class="text-ink-500 mb-10 max-w-md mx-auto">每一件作品都从一句话开始，创建你的第一份 AI 生成作品</p>
      <router-link :to="activeTab === 'ppt' ? '/generate' : '/poster'" class="inline-flex items-center gap-3 text-primary-700 border-b border-primary-300 hover:border-primary-700 pb-1 hover:gap-5 transition-all text-sm tracking-[0.25em] uppercase">
        立即创作
        <span>→</span>
      </router-link>
    </div>

    <!-- 作品列表：瀑布流 + FLIP 过渡 -->
    <TransitionGroup v-else name="flip-list" tag="div" class="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
      <div
        v-for="(w, i) in works"
        :key="w.id"
        v-reveal
        class="reveal shine-on-hover break-inside-avoid relative group cursor-pointer overflow-hidden bg-ink-100"
        :style="{ minHeight: (i % 3 === 0 ? 420 : 280) + 'px' }"
      >
        <!-- 缩略图 -->
        <img
          v-if="w.previewUrl"
          :src="w.previewUrl"
          :alt="w.title"
          class="w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-ink-100 to-ink-200">
          <svg class="w-12 h-12 text-ink-300" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" stroke-width="2"/></svg>
        </div>

        <!-- 编号水印 -->
        <div class="absolute top-5 left-5 editorial-number text-white/80 text-sm">
          Nº {{ String(i + 1).padStart(2, '0') }}
        </div>

        <!-- 状态徽章 -->
        <div class="absolute top-5 right-5">
          <span v-if="w.status === 'completed'" class="badge bg-emerald-500/90 text-white backdrop-blur">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5"/></svg>
            完成
          </span>
          <span v-else-if="w.status === 'processing'" class="badge bg-amber-500/90 text-white backdrop-blur">
            <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            生成中
          </span>
          <span v-else-if="w.status === 'failed'" class="badge bg-red-500/90 text-white backdrop-blur">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>
            失败
          </span>
        </div>

        <!-- 悬停遮罩 -->
        <div class="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex flex-col justify-end p-6">
          <div class="translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-white/50 text-xs tracking-[0.25em] uppercase">{{ formatDate(w.createdAt) }}</span>
              <span v-if="w.type === 'poster'" class="text-[10px] text-white/70 border border-white/30 px-1.5 py-0.5 tracking-wider">POSTER</span>
              <span v-else-if="w.type === 'ppt'" class="text-[10px] text-white/70 border border-white/30 px-1.5 py-0.5 tracking-wider">PPT</span>
              <span v-else-if="w.type === 'word'" class="text-[10px] text-white/70 border border-white/30 px-1.5 py-0.5 tracking-wider">DOC</span>
            </div>
            <h3 class="font-serif-cn text-white text-2xl mb-4 truncate">{{ w.title }}</h3>
            <div class="flex gap-3">
              <button
                v-if="w.status === 'completed'"
                class="inline-flex items-center gap-2 text-white border-b border-white/40 hover:border-white pb-0.5 text-sm tracking-wide transition-all"
                @click.stop="download(w)"
              >
                {{ w.type === 'poster' ? '下载图片' : w.type === 'word' ? '下载 Word' : '下载 PDF' }}
              </button>
              <span v-else-if="w.status === 'processing'" class="text-white/50 text-sm">生成中...</span>
              <button
                v-else
                class="inline-flex items-center gap-2 text-white border-b border-white/40 hover:border-white pb-0.5 text-sm tracking-wide transition-all"
                @click.stop="$router.push(w.type === 'poster' ? '/poster' : '/generate')"
              >
                重新生成
              </button>
            </div>
            <button
              class="absolute top-5 right-5 text-white/60 hover:text-red-300 transition-colors"
              @click.stop="remove(w.id)"
              aria-label="删除"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <!-- 移动端新建按钮 -->
    <router-link to="/generate" class="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-ink-900 text-white flex items-center justify-center shadow-lift z-30">
      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';
import { downloadWordDocx } from '@/api/word';

const userStore = useUserStore();
const loading = ref(true);
const works = ref<any[]>([]);
const activeTab = ref<'all' | 'ppt' | 'poster'>('all');
const counts = ref({ all: 0, ppt: 0, poster: 0 });
const quota = ref({ current: 0, max: 0 });

const quotaPercent = computed(() =>
  quota.value.max > 0 ? (quota.value.current / quota.value.max) * 100 : 0,
);

async function loadQuota() {
  try {
    const data: any = await request.get('/works/quota');
    quota.value = { current: data.current ?? 0, max: data.max ?? 0 };
  } catch {
    // 忽略配额加载错误
  }
}

const tabs = computed(() => [
  { value: 'all', label: 'All', count: counts.value.all },
  { value: 'ppt', label: 'PPT', count: counts.value.ppt },
  { value: 'poster', label: 'Poster', count: counts.value.poster },
]);

async function loadWorks() {
  loading.value = true;
  try {
    // 同时获取全部作品以计算各类型计数
    const [allData, pptData, posterData]: any[] = await Promise.all([
      request.get('/works'),
      request.get('/works?type=ppt'),
      request.get('/works?type=poster'),
    ]);
    counts.value = {
      all: allData.items?.length || 0,
      ppt: pptData.items?.length || 0,
      poster: posterData.items?.length || 0,
    };
    const source = activeTab.value === 'all' ? allData : activeTab.value === 'ppt' ? pptData : posterData;
    works.value = source.items || [];
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false;
  }
  loadQuota();
}

function switchTab(t: string) {
  if (activeTab.value === t) return;
  activeTab.value = t as any;
  loadWorks();
}

function download(w: any) {
  if (w.type === 'poster' && w.previewUrl) {
    // 海报直接下载图片
    const a = document.createElement('a');
    a.href = w.previewUrl;
    a.download = `poster-${w.id}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if (w.type === 'word') {
    // Word 文档：用 fetch + blob 带 JWT 下载
    downloadWordDocx(w.id).catch((e) => ElMessage.error(e.message || '下载失败'));
  } else {
    window.open(`/api/works/${w.id}/download`, '_blank');
  }
}

async function remove(id: number) {
  try {
    await ElMessageBox.confirm('确定删除这个作品吗？删除后无法恢复。', '删除作品', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    });
    await request.delete(`/works/${id}`);
    ElMessage.success('已删除');
    loadWorks();
    loadQuota();
  } catch {
    // 用户取消
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString('zh-CN');
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    loadWorks();
  } else {
    loading.value = false;
  }
});
</script>
