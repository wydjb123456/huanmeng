<template>
  <div class="bg-ink-50">
    <!-- Hero：全屏艺术 + 编辑式排版 -->
    <section class="relative h-screen min-h-[700px] overflow-hidden bg-ink-900">
      <!-- 主背景艺术图（轮播，交叉淡入淡出避免空窗） -->
      <img
        v-for="(art, i) in artworks"
        :key="art.src"
        :src="art.src"
        :alt="i === currentArtIndex ? art.title : ''"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
        :class="[i === currentArtIndex ? 'opacity-100 ken-burns' : 'opacity-0']"
        :style="i === currentArtIndex ? 'z-index: 2' : 'z-index: 1'"
      />

      <!-- 双层渐变遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-b from-ink-900/30 via-ink-900/20 to-ink-900/80"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-ink-900/40 via-transparent to-transparent"></div>

      <!-- 顶部小标 -->
      <div class="absolute top-32 left-6 sm:left-12 lg:left-20 z-10 fade-slow">
        <div class="flex items-center gap-3 text-white/70 text-xs tracking-[0.3em] uppercase">
          <span class="h-px w-12 bg-white/50"></span>
          <span>Vol. 01 — 视觉作品集</span>
        </div>
      </div>

      <!-- 主标题：编辑式衬线 + 意大利花体 -->
      <div class="absolute bottom-32 left-6 sm:left-12 lg:left-20 right-6 z-10 max-w-4xl">
        <h1 class="display-hero text-white text-6xl sm:text-7xl lg:text-[9rem] mb-6 reveal-up">
          让每一页<br />
          <span class="script-accent text-8xl sm:text-9xl lg:text-[12rem] -ml-2">成为</span>
          <span class="cal-cn">艺术品</span>
        </h1>
        <p class="text-white/80 text-base sm:text-lg max-w-md font-light leading-relaxed reveal-up" style="animation-delay: 0.3s;">
          AI 捕捉光影与色彩，将你的想法化作<br class="hidden sm:inline" />值得收藏的视觉作品
        </p>
      </div>

      <!-- 右下角：当前作品信息 -->
      <div class="absolute bottom-32 right-6 sm:right-12 lg:right-20 z-10 text-right text-white fade-slow" style="animation-delay: 0.6s;">
        <div class="editorial-number text-white/60 text-xs mb-1">Nº {{ String(currentArtIndex + 1).padStart(2, '0') }}</div>
        <div class="font-serif-cn text-xl mb-0.5">{{ currentArt.title }}</div>
        <div class="text-white/60 text-xs tracking-wide uppercase">{{ currentArt.style }}</div>
      </div>

      <!-- 底部指示器 + 切换 -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-6">
        <button class="text-white/60 hover:text-white text-2xl transition-colors" @click="prevArt" aria-label="上一幅">‹</button>
        <div class="flex gap-2">
          <button
            v-for="(art, i) in artworks"
            :key="art.src"
            class="h-px transition-all duration-500"
            :class="currentArtIndex === i ? 'w-12 bg-white' : 'w-6 bg-white/30 hover:bg-white/60'"
            @click="setArt(i)"
            :aria-label="`查看第 ${i + 1} 幅`"
          ></button>
        </div>
        <button class="text-white/60 hover:text-white text-2xl transition-colors" @click="nextArt" aria-label="下一幅">›</button>
      </div>
    </section>

    <!-- 宣言段：超大留白 + 衬线引文 + 花体强调 -->
    <section class="bg-ink-50 py-32 sm:py-48 relative overflow-hidden">
      <!-- 装饰元素：视差浮动 -->
      <div class="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary-200/30 blur-3xl parallax-drift pointer-events-none"></div>
      <div class="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-accent-200/20 blur-3xl parallax-drift pointer-events-none" style="animation-delay: -4s;"></div>
      <div v-reveal class="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <div class="editorial-number text-primary-500 text-sm mb-8">— Manifesto —</div>
        <p class="display-hero text-ink-900 text-3xl sm:text-5xl lg:text-6xl leading-tight mb-8">
          不是模板，<br />
          是<span class="script-accent text-7xl sm:text-8xl text-primary-700">表达</span>。
        </p>
        <p class="font-serif-cn text-ink-500 text-lg sm:text-xl leading-loose max-w-2xl mx-auto">
          每一次生成，都从空白画布开始。<br />
          AI 捕捉光影、笔触与色彩的呼吸，<br />
          将你的想法化作值得反复凝视的作品。
        </p>
      </div>
    </section>

    <!-- 画廊：编辑式编号 + 非对称瀑布流 -->
    <section class="bg-ink-50 pb-32">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <!-- 章节标题 -->
        <div v-reveal class="flex items-end justify-between mb-16 border-b border-ink-200 pb-6">
          <div>
            <div class="editorial-number text-primary-500 text-sm mb-2">Chapter I</div>
            <h2 class="font-serif-cn text-4xl sm:text-5xl font-medium text-ink-900">风格画廊</h2>
          </div>
          <p class="hidden sm:block text-ink-400 text-sm max-w-xs text-right">
            每一种风格，都是一种表达<br />
            — 滑动以感受
          </p>
        </div>

        <!-- 非对称瀑布流 -->
        <div class="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          <div
            v-for="(art, i) in galleryArts"
            :key="art.src"
            v-reveal
            class="reveal shine-on-hover break-inside-avoid relative group cursor-pointer overflow-hidden bg-ink-100"
            :class="art.size === 'tall' ? 'mb-8' : ''"
            @click="$router.push('/generate')"
          >
            <img
              :src="art.src"
              :alt="art.title"
              class="reveal-image w-full transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
              :style="{ height: (art.size === 'tall' ? 560 : 340) + 'px', objectFit: 'cover' }"
              loading="lazy"
              @error="(e) => { const t = e.target as HTMLElement; if (t.parentElement) t.parentElement.style.display = 'none'; }"
            />
            <!-- 编号水印 -->
            <div class="absolute top-5 left-5 editorial-number text-white/80 text-sm">
              Nº {{ String(i + 1).padStart(2, '0') }}
            </div>
            <!-- 悬停信息 -->
            <div class="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-end p-8">
              <div class="translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                <div class="text-white/50 text-xs tracking-[0.25em] uppercase mb-2">{{ art.style }}</div>
                <h3 class="font-serif-cn text-white text-3xl mb-2">{{ art.title }}</h3>
                <div class="inline-flex items-center gap-2 text-white/70 text-sm border-b border-white/40 pb-0.5">
                  点击创作
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 创作流程：大数字 + 衬线 -->
    <section class="relative py-40 overflow-hidden bg-ink-900 text-white">
      <img src="/images/starry-oil.webp" alt="" class="absolute inset-0 w-full h-full object-cover opacity-25 ken-burns" onerror="this.style.display='none'" />
      <div class="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-900/80 to-ink-900"></div>

      <div class="relative max-w-6xl mx-auto px-6 lg:px-8">
        <div v-reveal class="text-center mb-24">
          <div class="editorial-number text-white/40 text-sm mb-4">Chapter II</div>
          <h2 class="display-hero text-5xl sm:text-6xl lg:text-7xl mb-6">
            三步，<span class="script-accent text-7xl sm:text-8xl text-primary-300">化作作品</span>
          </h2>
          <p class="text-white/50 max-w-md mx-auto">无需设计经验，只需一句话</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
          <div v-for="(step, i) in steps" :key="i" v-reveal class="text-center md:text-left" :style="{ transitionDelay: (i * 0.15) + 's' }">
            <div class="display-hero italic text-white text-8xl mb-6 opacity-90">
              {{ String(i + 1).padStart(2, '0') }}
            </div>
            <div class="h-px w-12 bg-white/30 mb-6 mx-auto md:mx-0"></div>
            <h3 class="font-serif-cn text-2xl mb-3">{{ step.title }}</h3>
            <p class="text-white/60 text-sm leading-relaxed max-w-xs">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 最终 CTA：艺术图为主，文字极简 -->
    <section class="relative h-[80vh] min-h-[600px] overflow-hidden flex items-center justify-center">
      <img src="/images/aurora-mountain.webp" alt="" class="absolute inset-0 w-full h-full object-cover ken-burns" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
      <div class="absolute inset-0 bg-gradient-to-br from-ink-900/60 via-ink-900/40 to-ink-900/70"></div>

      <div v-reveal class="relative text-center px-6 max-w-3xl">
        <div class="editorial-number text-white/60 text-sm mb-6">— Coda —</div>
        <h2 class="display-hero text-white text-5xl sm:text-7xl lg:text-8xl mb-8">
          此刻，<br />
          <span class="script-accent text-7xl sm:text-9xl text-white">开始创作</span>
        </h2>
        <p class="text-white/70 text-lg mb-12 max-w-md mx-auto font-light">
          让你的下一个想法，成为值得珍藏的作品
        </p>
        <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <router-link to="/generate" class="inline-flex items-center gap-3 text-white border-b border-white/40 pb-1 hover:gap-5 hover:border-white transition-all text-sm tracking-[0.25em] uppercase breathe-glow">
            创作 PPT
            <span>→</span>
          </router-link>
          <router-link to="/poster" class="inline-flex items-center gap-3 text-white border-b border-white/40 pb-1 hover:gap-5 hover:border-white transition-all text-sm tracking-[0.25em] uppercase breathe-glow" style="animation-delay: 0.6s;">
            设计海报
            <span>→</span>
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const artworks = [
  { src: '/images/anime-landscape.webp', title: '田园牧歌', style: 'Pastoral Anime' },
  { src: '/images/watercolor-flowers.webp', title: '花海日落', style: 'Watercolor Impression' },
  { src: '/images/starry-oil.webp', title: '星夜', style: 'Post-Impressionist Oil' },
  { src: '/images/ukiyoe-wave.webp', title: '神奈川冲浪', style: 'Ukiyo-e' },
  { src: '/images/aurora-mountain.webp', title: '极光', style: 'Digital Painting' },
  { src: '/images/ink-wash-mountain.webp', title: '水墨山河', style: 'Chinese Ink Wash' },
  { src: '/images/impressionist-garden.webp', title: '花园印象', style: 'Impressionist Oil' },
  { src: '/images/surreal-islands.webp', title: '悬浮之境', style: 'Surreal Dreamscape' },
  { src: '/images/watercolor-autumn.webp', title: '秋日林径', style: 'Watercolor' },
];

const galleryArts = computed(() => [
  { ...artworks[0], size: 'tall' },
  { ...artworks[1], size: 'normal' },
  { ...artworks[5], size: 'normal' },
  { ...artworks[2], size: 'tall' },
  { ...artworks[6], size: 'normal' },
  { ...artworks[3], size: 'normal' },
  { ...artworks[7], size: 'tall' },
  { ...artworks[4], size: 'normal' },
  { ...artworks[8], size: 'normal' },
]);

const currentArtIndex = ref(0);
const currentArt = computed(() => artworks[currentArtIndex.value]);
let autoTimer: ReturnType<typeof setInterval> | null = null;

function setArt(i: number) {
  if (i === currentArtIndex.value) return;
  currentArtIndex.value = i;
}

function nextArt() {
  setArt((currentArtIndex.value + 1) % artworks.length);
}

function prevArt() {
  setArt((currentArtIndex.value - 1 + artworks.length) % artworks.length);
}

const steps = [
  { title: '描述想法', desc: '用一句话讲述你想要的作品，主题、氛围、风格皆可' },
  { title: 'AI 创作', desc: '智能生成 9 页完整内容，光影色彩一气呵成' },
  { title: '收藏下载', desc: '导出 PDF，随时欣赏，亦可转为可编辑演示文稿' },
];

onMounted(() => {
  // 预加载所有轮播图，避免切换空窗
  artworks.forEach((art) => {
    const img = new Image();
    img.src = art.src;
  });
  autoTimer = setInterval(nextArt, 7000);
});

onUnmounted(() => {
  if (autoTimer) clearInterval(autoTimer);
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
