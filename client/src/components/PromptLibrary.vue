<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-white max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <!-- 头部 -->
        <div class="px-8 py-5 border-b border-ink-200 flex items-center justify-between">
          <div>
            <div class="editorial-number text-primary-500 text-xs mb-1">— Library —</div>
            <h3 class="display-hero text-ink-900 text-2xl">提示词库</h3>
          </div>
          <button class="text-ink-400 hover:text-ink-900 transition-colors p-1" @click="$emit('close')" aria-label="关闭">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>

        <!-- 搜索框 -->
        <div class="px-8 py-4 border-b border-ink-100">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input
              v-model="search"
              class="w-full pl-9 pr-3 py-2 text-sm bg-ink-50 border-0 border-b border-transparent focus:border-ink-900 focus:bg-white focus:ring-0 transition-all"
              placeholder="搜索提示词..."
            />
          </div>
        </div>

        <!-- 分类切换 -->
        <div class="px-8 py-3 border-b border-ink-100 flex gap-2 flex-wrap">
          <button
            v-for="c in categories"
            :key="c.value"
            class="px-3 py-1 text-xs border transition-all"
            :class="activeCategory === c.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-600'"
            @click="activeCategory = c.value"
          >{{ c.label }}</button>
        </div>

        <!-- 列表 -->
        <div class="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            v-for="item in filtered"
            :key="item.title"
            class="text-left p-5 border border-ink-200 hover:border-ink-900 hover:bg-ink-50 transition-all group"
            @click="select(item)"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-serif-cn text-lg text-ink-900">{{ item.title }}</span>
              <span class="editorial-number text-ink-400 text-[10px]">{{ categoryLabel(item.category) }}</span>
            </div>
            <p class="text-xs text-ink-500 mb-3 leading-relaxed">{{ item.desc }}</p>
            <p class="text-xs text-ink-700 leading-relaxed line-clamp-3">{{ item.content }}</p>
            <div class="flex flex-wrap gap-1 mt-3">
              <span v-for="t in item.tags" :key="t" class="text-[10px] text-ink-500 border border-ink-200 px-1.5 py-0.5">{{ t }}</span>
            </div>
            <div class="mt-3 text-xs text-ink-900 border-b border-ink-300 group-hover:border-ink-900 inline-flex items-center gap-1 pb-0.5 group-hover:gap-2 transition-all">
              套用此提示词
              <span>→</span>
            </div>
          </button>
        </div>

        <!-- 底部 -->
        <div class="px-8 py-3 border-t border-ink-200 bg-ink-50 flex items-center justify-between text-xs text-ink-500">
          <span>{{ filtered.length }} 个提示词</span>
          <span>点击卡片即可套用到输入框</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import request from '@/api/request';

interface PromptItem {
  category: string;
  title: string;
  desc: string;
  content: string;
  tags: string[];
}

const props = defineProps<{ visible: boolean; type: 'ppt' | 'poster' }>();
const emit = defineEmits<{ close: []; select: [content: string] }>();

const library = ref<{ ppt: PromptItem[]; poster: PromptItem[] }>({ ppt: [], poster: [] });
const search = ref('');
const activeCategory = ref('all');

const categoryMap: Record<string, string> = {
  business: '商业', academic: '学术', product: '产品', education: '教育',
  marketing: '营销', personal: '个人',
  event: '活动', movie: '电影', festival: '节日',
  recruitment: '招聘', public_service: '公益',
};

function categoryLabel(c: string) {
  return categoryMap[c] ?? c;
}

const categories = computed(() => {
  const items = library.value[props.type] || [];
  const cats = Array.from(new Set(items.map((i) => i.category)));
  return [
    { value: 'all', label: '全部' },
    ...cats.map((c) => ({ value: c, label: categoryLabel(c) })),
  ];
});

const filtered = computed(() => {
  let items = library.value[props.type] || [];
  if (activeCategory.value !== 'all') {
    items = items.filter((i) => i.category === activeCategory.value);
  }
  const q = search.value.trim().toLowerCase();
  if (q) {
    items = items.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) ||
      i.content.toLowerCase().includes(q) ||
      i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return items;
});

function select(item: PromptItem) {
  emit('select', item.content);
  emit('close');
}

async function loadLibrary() {
  try {
    const data: any = await request.get('/works/prompt-library');
    library.value = { ppt: data.ppt || [], poster: data.poster || [] };
  } catch {
    // 静默失败
  }
}

watch(() => props.visible, (v) => {
  if (v && library.value.ppt.length === 0) loadLibrary();
});
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
