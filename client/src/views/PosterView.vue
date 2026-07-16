<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- 页头 -->
    <div v-reveal class="mb-10 pb-6 border-b border-ink-200">
      <div class="editorial-number text-primary-500 text-xs tracking-[0.3em] uppercase mb-3">— Poster —</div>
      <h1 class="display-hero text-ink-900 text-5xl mb-2">海报 <span class="script-accent text-7xl text-ink-900">设计</span></h1>
      <p class="text-ink-500">单张高冲击力视觉作品 · 按分辨率与渲染质量计费（5-30 积分）</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-8">
      <!-- 左侧：配置面板 -->
      <div class="space-y-5">
        <!-- 模式切换：海报设计 / 自由出图 -->
        <div class="flex border border-ink-200">
          <button
            class="flex-1 py-3 text-sm tracking-wide transition-all"
            :class="!form.freeMode ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:text-ink-900'"
            @click="form.freeMode = false"
          >海报设计</button>
          <button
            class="flex-1 py-3 text-sm tracking-wide transition-all"
            :class="form.freeMode ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:text-ink-900'"
            @click="form.freeMode = true"
          >自由出图</button>
        </div>

        <!-- 01 / Topic -->
        <div class="bg-white border border-ink-200/70 p-6">
          <div class="flex items-center justify-between mb-4">
            <label class="editorial-number text-ink-500 text-xs tracking-widest">{{ form.freeMode ? '01 / Prompt' : '01 / Title' }}</label>
            <div class="flex items-center gap-3">
              <button
                class="inline-flex items-center gap-1 text-xs text-ink-700 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all disabled:opacity-40"
                :disabled="enhancing || !form.prompt.trim()"
                @click="enhancePrompt"
              >
                <svg v-if="enhancing" class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
                <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                {{ enhancing ? '优化中' : '优化' }}
              </button>
              <button
                class="inline-flex items-center gap-1 text-xs text-ink-700 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all"
                @click="showLibrary = true"
              >📚 库</button>
              <span class="text-xs text-ink-400">{{ form.prompt.length }} chars</span>
            </div>
          </div>
          <!-- 自由模式：大 textarea，任意描述 -->
          <textarea
            v-if="form.freeMode"
            v-model="form.prompt"
            rows="5"
            class="w-full px-0 py-2 bg-transparent border-0 border-b border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 placeholder-ink-300 transition-colors text-base resize-none"
            placeholder="描述任何你想生成的图像，不限于海报。例如：一只在月光下休憩的橘猫，水彩风格，柔和的蓝色调，留白构图"
          ></textarea>
          <!-- 海报模式：标题输入框 -->
          <input
            v-else
            v-model="form.prompt"
            class="w-full px-0 py-2 bg-transparent border-0 border-b border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 placeholder-ink-300 transition-colors text-lg"
            placeholder="例如：夏日音乐节"
          />
          <!-- 优化建议 -->
          <div v-if="suggestions.length" class="mt-3 p-3 bg-primary-50/60 border border-primary-100">
            <div class="editorial-number text-primary-600 text-[10px] mb-1.5">— Suggestions —</div>
            <ul class="space-y-1">
              <li v-for="(s, i) in suggestions" :key="i" class="text-xs text-ink-600 flex gap-2">
                <span class="text-primary-500">·</span>{{ s }}
              </li>
            </ul>
          </div>
          <!-- 海报模式：副标题（自由模式隐藏） -->
          <div v-if="!form.freeMode" class="mt-4">
            <label class="text-xs text-ink-600 mb-2 block">副标题 / 时间地点 / 详细信息</label>
            <input
              v-model="form.subtitle"
              class="w-full px-0 py-1.5 bg-transparent border-0 border-b border-ink-200 focus:border-ink-400 focus:ring-0 text-sm text-ink-700 placeholder-ink-300 transition-colors"
              placeholder="例如：2026.07.20 · 上海·梅赛德斯文化中心"
            />
          </div>
          <!-- 自由模式：补充说明（可选） -->
          <div v-else class="mt-4">
            <label class="text-xs text-ink-600 mb-2 block">补充说明（可选）</label>
            <input
              v-model="form.subtitle"
              class="w-full px-0 py-1.5 bg-transparent border-0 border-b border-ink-200 focus:border-ink-400 focus:ring-0 text-sm text-ink-700 placeholder-ink-300 transition-colors"
              placeholder="例如：横版构图，突出氛围感"
            />
          </div>
        </div>

        <!-- 02 / Category（自由模式隐藏，海报专属） -->
        <div v-if="!form.freeMode" class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">02 / Category</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="c in categories"
              :key="c.value"
              class="p-2.5 text-center transition-all border"
              :class="form.category === c.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-700'"
              @click="form.category = c.value"
            >
              <div class="text-base mb-0.5">{{ c.icon }}</div>
              <div class="text-xs">{{ c.label }}</div>
            </button>
          </div>
          <input
            v-if="form.category === 'custom'"
            v-model="form.customCategory"
            class="w-full px-3 py-2 mt-3 text-sm bg-ink-50 border border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 placeholder-ink-400 transition-colors"
            placeholder="例如：毕业展、生日邀请、品牌联名、展览开幕..."
          />
        </div>

        <!-- 03 / Style -->
        <div class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">03 / Style</label>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <button
              v-for="s in styles"
              :key="s.value"
              class="p-3 text-left transition-all border"
              :class="form.style === s.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-700'"
              @click="form.style = s.value"
            >
              <div class="text-sm font-medium">{{ s.label }}</div>
              <div class="text-xs mt-0.5" :class="form.style === s.value ? 'text-white/60' : 'text-ink-400'">{{ s.desc }}</div>
            </button>
          </div>
          <input
            v-if="form.style === 'custom'"
            v-model="form.customStyle"
            class="w-full px-3 py-2 mt-2 text-sm bg-ink-50 border border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 placeholder-ink-400 transition-colors"
            placeholder="例如：日式和风，浮世绘配色，深蓝与朱红，传统纹样"
          />
          <div class="mt-3">
            <StyleReverseButton @reverse="onReverseStyle" />
          </div>
        </div>

        <!-- 03.5 / Reference -->
        <div class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-2 block">03.5 / Reference</label>
          <p class="text-xs text-ink-500 mb-3">上传 1-4 张参考图，AI 将基于参考图风格生成海报（可选）</p>
          <ReferenceUploader v-model="form.referenceImages" :max-count="4" />
        </div>

        <!-- 04 / Format -->
        <div class="bg-white border border-ink-200/70 p-6 space-y-5">
          <label class="editorial-number text-ink-500 text-xs tracking-widest block">04 / Format</label>

          <div>
            <div class="text-xs text-ink-600 mb-2">尺寸比例</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="a in aspectRatios"
                :key="a.value"
                class="p-2 text-center border transition-all"
                :class="form.aspectRatio === a.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-700'"
                @click="form.aspectRatio = a.value"
              >
                <div class="flex items-center justify-center mb-2 h-6">
                  <div class="border-2"
                       :class="form.aspectRatio === a.value ? 'border-white' : 'border-ink-400'"
                       :style="ratioPreviewStyle(a.value)"></div>
                </div>
                <div class="text-xs font-medium">{{ a.label }}</div>
                <div class="text-[10px]" :class="form.aspectRatio === a.value ? 'text-white/60' : 'text-ink-400'">{{ a.desc }}</div>
              </button>
            </div>
          </div>

          <div>
            <div class="text-xs text-ink-600 mb-2">分辨率</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="r in resolutions"
                :key="r.value"
                class="p-2 text-center border transition-all"
                :class="form.resolution === r.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-700'"
                @click="form.resolution = r.value"
              >
                <div class="text-xs font-medium">{{ r.label }}</div>
                <div class="text-[10px]" :class="form.resolution === r.value ? 'text-white/60' : 'text-ink-400'">{{ r.desc }}</div>
              </button>
            </div>
          </div>

          <div>
            <div class="text-xs text-ink-600 mb-2">渲染质量</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="q in renderQualities"
                :key="q.value"
                class="p-2 text-center border transition-all"
                :class="form.quality === q.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-700'"
                @click="form.quality = q.value"
              >
                <div class="text-xs font-medium">{{ q.label }}</div>
                <div class="text-[10px]" :class="form.quality === q.value ? 'text-white/60' : 'text-ink-400'">{{ q.desc }}</div>
              </button>
            </div>
          </div>

          <!-- ISCS 国际风格(可选) -->
          <div class="md:col-span-2 pt-2 border-t border-ink-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-ink-600">国际文化风格 <span class="text-ink-400">(可选)</span></span>
              <button v-if="form.styleTag" class="text-[11px] text-ink-400 hover:text-ink-600" @click="form.styleTag = ''">清除</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                class="px-2.5 py-1 text-[11px] border transition-all"
                :class="!form.styleTag ? 'border-ink-300 bg-ink-50 text-ink-500' : 'border-ink-200 text-ink-500 hover:border-ink-400'"
                @click="form.styleTag = ''"
              >默认</button>
              <button
                v-for="s in iscsStyles"
                :key="s.code"
                class="px-2.5 py-1 text-[11px] border transition-all"
                :class="form.styleTag === s.code ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-ink-200 text-ink-600 hover:border-ink-400'"
                :title="s.description"
                @click="form.styleTag = s.code"
              >{{ s.name_zh }}</button>
            </div>
          </div>

          <div>
            <div class="text-xs text-ink-600 mb-2">输出语言</div>
            <div class="flex gap-1">
              <button
                v-for="l in languages"
                :key="l.value"
                class="flex-1 py-1.5 text-xs border transition-all"
                :class="form.language === l.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-600'"
                @click="form.language = l.value"
              >{{ l.label }}</button>
            </div>
          </div>
        </div>

        <!-- 费用 + 生成 -->
        <div class="bg-ink-900 text-white p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <div class="editorial-number text-white/40 text-xs mb-1">Cost</div>
              <div class="text-2xl font-light">{{ computePosterCost(form.resolution, form.quality) }} <span class="text-sm text-white/60">积分</span></div>
            </div>
            <div class="text-right">
              <div class="editorial-number text-white/40 text-xs mb-1">Balance</div>
              <div class="text-2xl font-light">{{ userStore.userInfo?.balance ?? 0 }}</div>
            </div>
          </div>
          <button
            class="w-full py-3.5 bg-white text-ink-900 text-sm tracking-[0.2em] uppercase hover:gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            :disabled="!form.prompt.trim() || generating || (userStore.userInfo?.balance ?? 0) < computePosterCost(form.resolution, form.quality)"
            @click="generate"
          >
            <svg v-if="generating" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ generating ? '生成中' : '生成海报' }}
            <span v-if="!generating">→</span>
          </button>
          <p v-if="(userStore.userInfo?.balance ?? 0) < computePosterCost(form.resolution, form.quality)" class="text-xs text-amber-400 mt-3 text-center">
            积分不足，请前往充值
          </p>
        </div>
      </div>

      <!-- 右侧：预览/进度/结果 -->
      <div class="bg-white border border-ink-200/70 p-8 min-h-[600px] overflow-hidden">
        <!-- 空状态 -->
        <div v-if="!generating && !resultUrl && !errorMsg" class="h-full flex flex-col items-center justify-center text-center py-20 relative overflow-hidden">
          <img src="/images/ukiyoe-wave.webp" alt="" class="absolute inset-0 w-full h-full object-cover opacity-10" onerror="this.style.display='none'" />
          <div class="relative">
            <div class="editorial-number text-primary-400 text-sm mb-4">— Awaiting —</div>
            <h3 class="display-hero text-ink-900 text-3xl mb-3">等待开始</h3>
            <p class="text-sm text-ink-500 max-w-sm">输入标题，选择用途、风格和比例，点击生成按钮即可</p>
            <div class="mt-10 grid grid-cols-3 gap-4 max-w-md text-left">
              <div v-for="(t, i) in tips" :key="i" class="text-center">
                <div class="text-2xl mb-2">{{ t.icon }}</div>
                <div class="font-serif-cn text-sm text-ink-900 mb-1">{{ t.title }}</div>
                <div class="text-xs text-ink-500 leading-relaxed">{{ t.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 生成中 -->
        <div v-else-if="generating" class="h-full flex flex-col items-center justify-center py-12">
          <div class="w-full max-w-md">
            <div class="relative w-32 h-32 mx-auto mb-8">
              <svg class="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="1" class="text-ink-100"/>
                <circle
                  cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  class="text-ink-900 transition-all duration-500"
                  :stroke-dasharray="276"
                  :stroke-dashoffset="276 - (276 * progress) / 100"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="display-hero text-ink-900 text-4xl">{{ progress }}<span class="text-xl">%</span></div>
                <div class="editorial-number text-ink-400 text-[10px] mt-1">In Progress</div>
              </div>
            </div>
            <div class="text-center mb-8">
              <div class="editorial-number text-primary-500 text-xs mb-3">— Composing —</div>
              <h3 class="display-hero text-ink-900 text-3xl mb-2">创作中</h3>
              <p class="text-sm text-ink-500">AI 正在构图、配色、排版，通常需 2-4 分钟</p>
            </div>
            <div class="space-y-3 border-t border-ink-200 pt-6">
              <div v-for="(s, i) in progressSteps" :key="i" class="flex items-center gap-4">
                <div class="editorial-number text-sm w-8" :class="currentStep > i ? 'text-ink-900' : currentStep === i ? 'text-primary-600' : 'text-ink-300'">
                  {{ String(i + 1).padStart(2, '0') }}
                </div>
                <div class="h-px flex-1" :class="currentStep > i ? 'bg-ink-900' : 'bg-ink-200'"></div>
                <div class="text-sm tracking-wide" :class="currentStep >= i ? 'text-ink-900' : 'text-ink-400'">{{ s }}</div>
                <svg v-if="currentStep === i" class="w-3 h-3 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
                <svg v-else-if="currentStep > i" class="w-4 h-4 text-ink-900" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 失败 -->
        <div v-else-if="errorMsg" class="h-full flex flex-col items-center justify-center text-center py-20">
          <div class="editorial-number text-red-400 text-xs mb-6">— Error —</div>
          <h3 class="display-hero text-ink-900 text-4xl mb-3">生成失败</h3>
          <p class="text-sm text-ink-500 mb-2 max-w-sm">{{ errorMsg }}</p>
          <p class="text-xs text-ink-400 mb-10">积分已退还</p>
          <button class="inline-flex items-center gap-2 text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-4 transition-all text-sm tracking-wide" @click="reset">
            重新生成<span>→</span>
          </button>
        </div>

        <!-- 结果 -->
        <div v-else-if="resultUrl">
          <div class="flex items-end justify-between mb-6 pb-4 border-b border-ink-200">
            <div>
              <div class="editorial-number text-emerald-600 text-xs mb-2">— Completed —</div>
              <h3 class="display-hero text-ink-900 text-3xl">生成完成</h3>
            </div>
            <span class="badge bg-emerald-50 text-emerald-700">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5"/></svg>
              成功
            </span>
          </div>

          <!-- 海报预览（按比例展示） -->
          <div class="flex justify-center mb-6">
            <div class="overflow-hidden border border-ink-200 relative group bg-ink-100"
                 :style="resultContainerStyle">
              <img :src="resultUrl" alt="生成结果" loading="lazy" class="w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.02]" />
              <div class="absolute top-4 left-4 editorial-number text-white/80 text-sm">Nº 01</div>
            </div>
          </div>

          <div class="flex flex-wrap gap-6 justify-center">
            <a :href="resultUrl" download
               class="inline-flex items-center gap-3 text-white bg-ink-900 px-6 py-3 hover:gap-5 transition-all text-sm tracking-[0.2em] uppercase">
              下载图片 <span>↓</span>
            </a>
            <button class="inline-flex items-center gap-3 text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-5 transition-all text-sm tracking-[0.2em] uppercase" @click="reset">
              重新生成
            </button>
            <router-link to="/works" class="inline-flex items-center text-ink-500 hover:text-ink-900 transition-colors text-sm tracking-wide">
              查看作品
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示词库弹窗 -->
    <PromptLibrary :visible="showLibrary" type="poster" @close="showLibrary = false" @select="onLibrarySelect" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onUnmounted, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useWorksStore } from '@/stores/works';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import { getStyles, type StyleVariantSummary } from '@/api/iscs';
import PromptLibrary from '@/components/PromptLibrary.vue';
import ReferenceUploader from '@/components/ReferenceUploader.vue';
import StyleReverseButton from '@/components/StyleReverseButton.vue';

const route = useRoute();
const userStore = useUserStore();
const worksStore = useWorksStore();

// ISCS 风格列表
const iscsStyles = ref<StyleVariantSummary[]>([]);
onMounted(async () => {
  // 解析路由参数(来自模板画廊)
  if (route.query.prompt) {
    form.prompt = route.query.prompt as string;
  }
  if (route.query.category) {
    const validCats = categories.map(c => c.value);
    if (validCats.includes(route.query.category as string)) {
      form.category = route.query.category as string;
    }
  }
  if (route.query.style) {
    const validStyles = styles.map(s => s.value);
    if (validStyles.includes(route.query.style as string)) {
      form.style = route.query.style as string;
    }
  }
  if (route.query.reference) {
    form.referenceImages = [route.query.reference as string];
  }

  // 恢复进行中的海报生成任务
  const aw = worksStore.activeWork;
  if (aw && aw.type === 'poster') {
    workId.value = aw.workId;
    progress.value = aw.progress;
    if (aw.status === 'completed') {
      const slide = aw.slides?.[0];
      resultUrl.value = slide?.imageUrl || '';
      progress.value = 100;
      currentStep.value = 4;
      generating.value = false;
    } else if (aw.status === 'failed') {
      errorMsg.value = aw.error;
      generating.value = false;
    } else {
      currentStep.value = 2;
      generating.value = true;
    }
  }
  // 同步 store 状态变化到本地
  watch(() => worksStore.activeWork, (aw) => {
    if (!aw || aw.type !== 'poster') return;
    workId.value = aw.workId;
    progress.value = aw.progress;
    if (aw.status === 'completed') {
      const slide = aw.slides?.[0];
      resultUrl.value = slide?.imageUrl || '';
      progress.value = 100;
      currentStep.value = 4;
      generating.value = false;
    } else if (aw.status === 'failed') {
      errorMsg.value = aw.error;
      generating.value = false;
    }
  }, { deep: true });

  try {
    const data: any = await getStyles();
    iscsStyles.value = data.styles || [];
  } catch {
    // 静默失败
  }
});

const form = reactive({
  prompt: '',
  subtitle: '',
  category: 'event',
  customCategory: '',
  style: 'creative',
  customStyle: '',
  aspectRatio: '9:16',
  language: 'zh',
  referenceImages: [] as string[],
  freeMode: false,  // 自由模式：非海报设计，prompt 直接作为图像生成指令
  resolution: '2K',  // 分辨率：1K/2K(默认)/4K
  quality: 'high',  // 渲染质量：low/medium/high(默认)
  styleTag: '' as string,  // ISCS 国际风格标签(可选)
});

const categories = [
  { value: 'event', label: '活动宣传', icon: '🎪' },
  { value: 'movie', label: '电影演出', icon: '🎬' },
  { value: 'product', label: '产品推广', icon: '🛍️' },
  { value: 'festival', label: '节日祝福', icon: '🎉' },
  { value: 'recruitment', label: '招聘海报', icon: '💼' },
  { value: 'public_service', label: '公益', icon: '🌱' },
  { value: 'custom', label: '自定义', icon: '✎' },
  { value: 'none', label: '无', icon: '∅' },
];

const styles = [
  { value: 'business', label: '商务专业', desc: '蓝白配色，正式严谨' },
  { value: 'minimal', label: '现代简约', desc: '大量留白，极简几何' },
  { value: 'creative', label: '活泼创意', desc: '鲜艳色彩，动态布局' },
  { value: 'academic', label: '学术严谨', desc: '衬线字体，数据图表' },
  { value: 'custom', label: '自定义', desc: '自由描述风格' },
  { value: 'none', label: '无', desc: '不限定，AI 自由发挥' },
];

const aspectRatios = [
  { value: '9:16', label: '9:16 竖版', desc: '社媒故事/手机' },
  { value: '9:21', label: '9:21 竖版', desc: '全屏故事/长图' },
  { value: '1:1', label: '1:1 方版', desc: 'Instagram' },
  { value: '4:5', label: '4:5 竖版', desc: 'Instagram 竖图' },
  { value: '16:9', label: '16:9 横版', desc: '横幅/视频封面' },
  { value: '2:3', label: '2:3 A4', desc: '印刷海报' },
  { value: '3:4', label: '3:4 竖版', desc: '展示/演示' },
  { value: '3:2', label: '3:2 横版', desc: '传单/横版' },
  { value: '21:9', label: '21:9 横幅', desc: '网页 banner' },
];

const resolutions = [
  { value: '1K', label: '1K', desc: '快速预览' },
  { value: '2K', label: '2K', desc: '推荐' },
  { value: '4K', label: '4K', desc: '最高品质' },
];

const renderQualities = [
  { value: 'low', label: '低', desc: '快速渲染' },
  { value: 'medium', label: '中', desc: '标准' },
  { value: 'high', label: '高', desc: '精细渲染' },
];

function computePosterCost(resolution: string, quality: string) {
  const matrix: Record<string, Record<string, number>> = {
    '1K': { low: 5, medium: 8, high: 15 },
    '2K': { low: 8, medium: 12, high: 20 },
    '4K': { low: 12, medium: 18, high: 30 },
  };
  return matrix[resolution]?.[quality] ?? 20;
}

const languages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'EN' },
  { value: 'bilingual', label: '双语' },
];

const tips = [
  { icon: '✨', title: '一键生成', desc: '无需大纲，直接出图' },
  { icon: '📐', title: '多种比例', desc: '适配不同场景' },
  { icon: '🎨', title: '风格自由', desc: '商务到创意' },
];

const progressSteps = ['提交任务', 'AI 构图', '渲染细节', '完成'];
const progress = ref(0);
const currentStep = ref(0);
const generating = ref(false);
const errorMsg = ref('');
const enhancing = ref(false);
const showLibrary = ref(false);
const suggestions = ref<string[]>([]);
const resultUrl = ref('');
const workId = ref<number | null>(null);

function ratioPreviewStyle(ratio: string) {
  const [w, h] = ratio.split(':').map(Number);
  const scale = 20 / Math.max(w, h);
  const sw = Math.max(6, Math.floor(w * scale));
  const sh = Math.max(6, Math.floor(h * scale));
  return { width: sw + 'px', height: sh + 'px' };
}

const resultContainerStyle = computed(() => {
  const ratio = form.aspectRatio;
  const [w, h] = ratio.split(':').map(Number);
  const ratioVal = h / w;
  // 容器固定宽 480px，高度按比例计算（限制最大高度 600px）
  const maxW = 480;
  let cw = maxW;
  let ch = Math.floor(cw * ratioVal);
  if (ch > 600) {
    ch = 600;
    cw = Math.floor(ch / ratioVal);
  }
  return { width: cw + 'px', height: ch + 'px' };
});

async function enhancePrompt() {
  if (!form.prompt.trim()) {
    ElMessage.warning('请先输入标题');
    return;
  }
  enhancing.value = true;
  suggestions.value = [];
  try {
    const data: any = await request.post('/works/prompt/enhance', {
      input: form.prompt,
      type: 'poster',
    });
    if (data.enhanced) form.prompt = data.enhanced;
    if (data.suggestions) suggestions.value = data.suggestions;
    ElMessage.success('提示词已优化');
  } catch {
    // 错误已由拦截器处理
  } finally {
    enhancing.value = false;
  }
}

function onLibrarySelect(content: string) {
  form.prompt = content;
  showLibrary.value = false;
  ElMessage.success('已套用提示词');
}

function onReverseStyle(style: string) {
  form.style = 'custom';
  form.customStyle = style;
}

async function generate() {
  if (!form.prompt.trim()) {
    ElMessage.warning(form.freeMode ? '请输入描述' : '请输入标题');
    return;
  }
  if (form.style === 'custom' && !form.customStyle.trim()) {
    ElMessage.warning('选择了自定义风格但未填写描述');
    return;
  }
  if (form.category === 'custom' && !form.customCategory.trim()) {
    ElMessage.warning('选择了自定义用途但未填写描述');
    return;
  }
  reset();
  generating.value = true;
  currentStep.value = 0;
  progress.value = 0;

  // 模拟步骤推进
  startStepSimulation();

  try {
    const data: any = await request.post('/works/poster', {
      prompt: form.prompt,
      subtitle: form.subtitle,
      category: form.category,
      customCategory: form.category === 'custom' ? form.customCategory : undefined,
      style: form.style,
      customStyle: form.style === 'custom' ? form.customStyle : undefined,
      aspectRatio: form.aspectRatio,
      language: form.language,
      freeMode: form.freeMode || undefined,
      referenceImages: form.referenceImages.length > 0 ? form.referenceImages : undefined,
      resolution: form.resolution,
      quality: form.quality,
      styleTag: form.styleTag || undefined,
    });
    workId.value = data.workId;
    currentStep.value = 1;
    startPolling();
  } catch {
    generating.value = false;
    errorMsg.value = '提交失败，请稍后重试';
  }
}

let stepTimer: ReturnType<typeof setInterval> | null = null;
function startStepSimulation() {
  stepTimer = setInterval(() => {
    if (currentStep.value < 2) currentStep.value = 2;
  }, 8000);
}

function startPolling() {
  if (workId.value) {
    worksStore.setActiveWork(workId.value, 'poster');
  }
}

function stopStepSim() {
  if (stepTimer) { clearInterval(stepTimer); stepTimer = null; }
}

function reset() {
  workId.value = null;
  progress.value = 0;
  currentStep.value = 0;
  errorMsg.value = '';
  resultUrl.value = '';
  generating.value = false;
  stopStepSim();
  worksStore.clear();
}

onUnmounted(() => {
  stopStepSim();
});
</script>
