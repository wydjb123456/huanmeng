<template>
  <div>
    <!-- 顶部艺术横幅：编辑式 -->
    <section class="relative h-[55vh] min-h-[440px] overflow-hidden">
      <img src="/images/watercolor-flowers.webp" alt="" class="absolute inset-0 w-full h-full object-cover" onerror="this.style.display='none'" />
      <div class="absolute inset-0 bg-gradient-to-b from-ink-900/50 via-ink-900/30 to-ink-50"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-ink-900/40 via-transparent to-transparent"></div>

      <div class="relative h-full flex flex-col justify-end max-w-7xl mx-auto px-6 lg:px-8 pb-16">
        <div class="flex items-center gap-3 text-white/70 text-xs tracking-[0.3em] uppercase mb-4">
          <span class="h-px w-12 bg-white/50"></span>
          <span>Chapter — Gallery</span>
        </div>
        <h1 class="display-hero text-white text-6xl sm:text-7xl lg:text-8xl mb-4">
          风格<span class="script-accent text-8xl sm:text-9xl text-white">画廊</span>
        </h1>
        <p class="text-white/80 max-w-md font-light">选择一种风格，开启你的创作</p>
      </div>
    </section>

    <div class="max-w-7xl mx-auto px-6 lg:px-8 -mt-10 relative pb-24">
      <!-- 分类筛选：极简标签 -->
      <div class="flex flex-wrap items-center gap-6 mb-16 pb-6 border-b border-ink-200">
        <div class="editorial-number text-ink-400 text-xs tracking-widest uppercase mr-2">Filter —</div>
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="group relative pb-1 text-sm tracking-wide transition-all"
          :class="selectedCat === cat.value ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'"
          @click="selectedCat = cat.value"
        >
          {{ cat.label }}
          <span
            class="absolute -bottom-px left-0 h-px bg-ink-900 transition-all duration-300"
            :class="selectedCat === cat.value ? 'w-full' : 'w-0 group-hover:w-full'"
          ></span>
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        <div v-for="i in 6" :key="i" class="break-inside-avoid">
          <div :class="i % 3 === 0 ? 'h-[480px]' : 'h-[320px]'" class="skeleton rounded-sm"></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredTemplates.length === 0" class="py-32 text-center">
        <div class="editorial-number text-primary-400 text-sm mb-6">— Coming Soon —</div>
        <h3 class="display-hero text-ink-900 text-4xl mb-3">模板即将上线</h3>
        <p class="text-ink-500 mb-10 max-w-md mx-auto">我们正在精心设计更多模板，敬请期待</p>
        <router-link to="/generate" class="inline-flex items-center gap-3 text-primary-700 border-b border-primary-300 hover:border-primary-700 pb-1 hover:gap-5 transition-all text-sm tracking-[0.25em] uppercase">
          直接使用 AI 生成
          <span>→</span>
        </router-link>
      </div>

      <!-- 模板瀑布流：编辑式 -->
      <div v-else class="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        <div
          v-for="(t, i) in filteredTemplates"
          :key="t.id"
          class="break-inside-avoid relative group cursor-pointer overflow-hidden bg-ink-100"
          @click="useTemplate(t)"
        >
          <img
            v-if="t.thumbnail"
            :src="t.thumbnail"
            :alt="t.name"
            class="w-full transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
            :style="{ height: (i % 3 === 0 ? 480 : 320) + 'px', objectFit: 'cover' }"
            loading="lazy"
          />
          <div
            v-else
            class="w-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50"
            :style="{ height: (i % 3 === 0 ? 480 : 320) + 'px' }"
          >
            <svg class="w-12 h-12 text-primary-300" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v14H4z M4 9h16" stroke="currentColor" stroke-width="2"/></svg>
          </div>

          <!-- 编号水印 -->
          <div class="absolute top-5 left-5 editorial-number text-white/80 text-sm">
            Nº {{ String(i + 1).padStart(2, '0') }}
          </div>

          <!-- 悬停遮罩 -->
          <div class="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-end p-8">
            <div class="translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
              <div class="text-white/50 text-xs tracking-[0.25em] uppercase mb-2">{{ t.category }}</div>
              <h3 class="font-serif-cn text-white text-3xl mb-2">{{ t.name }}</h3>
              <div class="inline-flex items-center gap-2 text-white/70 text-sm border-b border-white/40 pb-0.5">
                使用此模板
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

const router = useRouter();
const loading = ref(true);
const templates = ref<any[]>([]);
const selectedCat = ref('all');

const categories = [
  { value: 'all', label: '全部' },
  { value: 'business', label: '商务' },
  { value: 'academic', label: '学术' },
  { value: 'creative', label: '创意' },
  { value: 'marketing', label: '营销' },
];

const filteredTemplates = computed(() => {
  if (selectedCat.value === 'all') return templates.value;
  return templates.value.filter((t) => t.category === selectedCat.value);
});

function useTemplate(t: any) {
  ElMessage.info(`模板"${t.name}"即将支持，当前请使用 AI 生成`);
  router.push('/generate');
}

onMounted(async () => {
  try {
    const data: any = await request.get('/templates');
    templates.value = data.items || [];
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false;
  }
});
</script>
