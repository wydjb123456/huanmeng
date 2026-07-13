<template>
  <div class="min-h-screen flex items-center justify-center bg-ink-50 px-6 relative overflow-hidden">
    <!-- 背景艺术图：极淡 -->
    <img src="/images/surreal-islands.webp" alt="" class="absolute inset-0 w-full h-full object-cover opacity-[0.08]" onerror="this.style.display='none'" />

    <div class="relative text-center max-w-lg">
      <!-- 编号 -->
      <div class="editorial-number text-primary-500 text-xs tracking-[0.3em] mb-8">— Lost in Canvas —</div>

      <!-- 404 大字 -->
      <h1 class="display-hero text-ink-900 text-[10rem] sm:text-[14rem] leading-none mb-2">
        4<span class="script-accent text-primary-600 text-[14rem] sm:text-[18rem]">0</span>4
      </h1>

      <!-- 副标 -->
      <h2 class="font-serif-cn text-ink-700 text-2xl mb-4">页面走失了</h2>
      <p class="text-ink-500 text-sm leading-relaxed max-w-sm mx-auto mb-12">
        你所寻找的页面像一幅未完成的画，<br />
        消失在了色彩的边界之外
      </p>

      <!-- 返回链接 -->
      <div class="flex flex-wrap items-center justify-center gap-8">
        <router-link to="/" class="inline-flex items-center gap-3 text-ink-900 bg-ink-900 text-white px-6 py-3 hover:gap-5 transition-all text-sm tracking-[0.2em] uppercase">
          返回首页
          <span>→</span>
        </router-link>
        <router-link to="/generate" class="inline-flex items-center gap-3 text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-5 transition-all text-sm tracking-[0.2em] uppercase">
          去创作
          <span>→</span>
        </router-link>
      </div>

      <!-- 底部装饰 -->
      <div class="mt-20 flex items-center justify-center gap-4">
        <span class="h-px w-16 bg-ink-200"></span>
        <span class="editorial-number text-ink-300 text-[10px]">Nº 404</span>
        <span class="h-px w-16 bg-ink-200"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
