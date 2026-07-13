<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- 页头 -->
    <div v-reveal class="mb-12">
      <div class="editorial-number text-primary-500 text-xs mb-2">— Word Document —</div>
      <h1 class="display-hero text-ink-900 text-5xl mb-3">文档生成</h1>
      <p class="text-sm text-ink-500">先免费生成章节大纲，确认后按章节逐个生成正文，随时预览，最后导出 Word 文档。</p>
    </div>

    <!-- ============ Step 0：输入主题 ============ -->
    <div v-if="step === 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-5">
        <!-- 01 / Topic -->
        <div class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">01 / Topic</label>
          <textarea
            v-model="form.prompt"
            rows="3"
            class="w-full px-0 py-2 bg-transparent border-0 border-b border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 placeholder-ink-300 transition-colors text-base resize-none"
            placeholder="输入文档主题，例如：人工智能在教育领域的应用与未来展望"
          ></textarea>
        </div>

        <!-- 02 / Category -->
        <div class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">02 / Category</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="c in categories"
              :key="c.value"
              class="p-2 text-center transition-all border text-xs"
              :class="form.category === c.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-700'"
              @click="form.category = c.value"
            >{{ c.label }}</button>
          </div>
          <input
            v-if="form.category === 'custom'"
            v-model="form.customCategory"
            class="w-full px-3 py-2 mt-3 text-sm bg-ink-50 border border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 placeholder-ink-400 transition-colors"
            placeholder="自定义类型描述..."
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
            placeholder="例如：学术严谨，正式书面语，逻辑清晰..."
          />
          <button
            class="mt-3 text-xs text-primary-600 hover:text-primary-700 border-b border-primary-300 hover:border-primary-600 pb-0.5 transition-all"
            @click="showReverseModal = true"
          >从图片提取风格 →</button>
        </div>

        <!-- 04 / Config -->
        <div class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">04 / Config</label>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <div class="text-xs text-ink-600 mb-2">章节数</div>
              <input v-model.number="form.sectionCount" type="number" min="2" max="20" class="w-full px-2 py-1.5 text-sm border border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900" />
            </div>
            <div>
              <div class="text-xs text-ink-600 mb-2">语言</div>
              <select v-model="form.language" class="w-full px-2 py-1.5 text-sm border border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 bg-white">
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="bilingual">双语</option>
              </select>
            </div>
            <div>
              <div class="text-xs text-ink-600 mb-2">详情程度</div>
              <select v-model="form.detailLevel" class="w-full px-2 py-1.5 text-sm border border-ink-200 focus:border-ink-900 focus:ring-0 text-ink-900 bg-white">
                <option value="brief">简洁</option>
                <option value="standard">标准</option>
                <option value="detailed">详细</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 提交 -->
        <div class="bg-ink-900 text-white p-6">
          <div class="editorial-number text-white/40 text-xs mb-2">— Next —</div>
          <p class="text-sm text-white/80 mb-6 leading-relaxed">AI 将根据主题生成 {{ form.sectionCount }} 个章节大纲。大纲免费、可任意编辑。</p>
          <button
            class="w-full py-3.5 bg-white text-ink-900 text-sm tracking-[0.2em] uppercase hover:gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            :disabled="!form.prompt.trim() || generatingOutline"
            @click="generateOutline"
          >
            <svg v-if="generatingOutline" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ generatingOutline ? '生成中' : '生成大纲' }}
            <span v-if="!generatingOutline">→</span>
          </button>
        </div>
      </div>

      <!-- 右侧：流程介绍 -->
      <div class="bg-white border border-ink-200/70 p-8 min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden">
        <img src="/images/watercolor-flowers.webp" alt="" class="absolute inset-0 w-full h-full object-cover opacity-10" onerror="this.style.display='none'" />
        <div class="relative">
          <div class="editorial-number text-primary-400 text-sm mb-4">— Workflow —</div>
          <h3 class="display-hero text-ink-900 text-3xl mb-4">三步成文</h3>
          <div class="text-left space-y-4 max-w-sm mx-auto">
            <div v-for="(f, i) in flowIntro" :key="i" class="flex gap-4">
              <div class="editorial-number text-primary-500 text-sm w-6 flex-shrink-0">{{ String(i + 1).padStart(2, '0') }}</div>
              <div>
                <div class="font-serif-cn text-ink-900 text-base mb-1">{{ f.title }}</div>
                <div class="text-xs text-ink-500 leading-relaxed">{{ f.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ Step 1：编辑大纲 ============ -->
    <div v-else-if="step === 1" class="space-y-6">
      <div class="flex items-end justify-between pb-4 border-b border-ink-200">
        <div>
          <div class="editorial-number text-primary-500 text-xs mb-1">— Outline —</div>
          <h2 class="display-hero text-ink-900 text-3xl">编辑大纲</h2>
          <p class="text-sm text-ink-500 mt-1">{{ outline.length }} 个章节 · 可增删改排序 · 免费</p>
        </div>
        <div class="flex gap-3">
          <button class="text-sm text-ink-600 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all" @click="step = 0">← 返回</button>
          <button class="inline-flex items-center gap-1 text-sm text-ink-700 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all" @click="addSection">+ 添加章节</button>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="(s, i) in outline"
          :key="s._key"
          class="bg-white border border-ink-200/70 p-5 flex gap-5 group"
        >
          <div class="editorial-number text-primary-500 text-lg flex-shrink-0 w-10 pt-1">{{ String(i + 1).padStart(2, '0') }}</div>
          <div class="flex-1 space-y-3">
            <input
              v-model="s.title"
              class="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-ink-900 focus:ring-0 font-serif-cn text-lg text-ink-900 transition-colors"
              placeholder="章节标题"
            />
            <textarea
              v-model="s.summary"
              rows="2"
              class="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-ink-400 focus:ring-0 text-sm text-ink-600 placeholder-ink-300 transition-colors resize-none"
              placeholder="章节摘要（1-2 句话描述本章内容）"
            ></textarea>
          </div>
          <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button :disabled="i === 0" class="text-ink-400 hover:text-ink-900 disabled:opacity-20 p-1" @click="moveSection(i, -1)" aria-label="上移">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M5 15l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button :disabled="i === outline.length - 1" class="text-ink-400 hover:text-ink-900 disabled:opacity-20 p-1" @click="moveSection(i, 1)" aria-label="下移">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M19 9l-7 7-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button :disabled="outline.length <= 1" class="text-ink-400 hover:text-red-500 disabled:opacity-20 p-1" @click="removeSection(i)" aria-label="删除">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="bg-ink-900 text-white p-6">
        <div class="flex items-center justify-between">
          <div>
            <div class="editorial-number text-white/40 text-xs mb-1">— Generate —</div>
            <p class="text-sm text-white/80">创建文档后即可逐章生成正文（10 积分/章）</p>
          </div>
          <button
            class="px-8 py-3.5 bg-white text-ink-900 text-sm tracking-[0.2em] uppercase hover:gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            :disabled="creating || outline.length === 0"
            @click="createWork"
          >
            <svg v-if="creating" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ creating ? '创建中' : '创建文档' }}
            <span v-if="!creating">→</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Step 2：逐章节生成 ============ -->
    <div v-else-if="step === 2" class="space-y-6">
      <div class="flex items-end justify-between pb-4 border-b border-ink-200">
        <div>
          <div class="editorial-number text-primary-500 text-xs mb-1">— Writing —</div>
          <h2 class="display-hero text-ink-900 text-3xl">逐章节生成</h2>
          <p class="text-sm text-ink-500 mt-1">{{ completedCount }}/{{ sections.length }} 章已完成 · 每章 10 积分 · 可随时预览</p>
        </div>
        <div class="flex gap-3">
          <button class="text-sm text-ink-600 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all" @click="step = 1">← 编辑大纲</button>
        </div>
      </div>

      <!-- 整体进度 -->
      <div class="bg-white border border-ink-200/70 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-ink-500 tracking-widest">PROGRESS</span>
          <span class="editorial-number text-ink-900 text-sm">{{ overallProgress }}%</span>
        </div>
        <div class="h-1 bg-ink-100 overflow-hidden">
          <div class="h-full bg-ink-900 transition-all duration-500" :style="{ width: overallProgress + '%' }"></div>
        </div>
      </div>

      <!-- 章节列表 -->
      <div class="space-y-4">
        <div
          v-for="(s, i) in sections"
          :key="i"
          class="bg-white border border-ink-200/70 p-6"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-start gap-4 flex-1">
              <div class="editorial-number text-primary-500 text-lg flex-shrink-0 w-10 pt-1">{{ String(i + 1).padStart(2, '0') }}</div>
              <div class="flex-1">
                <h3 class="font-serif-cn text-xl text-ink-900 mb-1">{{ s.title }}</h3>
                <p v-if="s.content && s.status !== 'completed'" class="text-xs text-ink-400">{{ s.content }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="s.status === 'completed'" class="text-xs text-green-600 px-2 py-1 bg-green-50">已完成</span>
              <span v-else-if="s.status === 'processing'" class="text-xs text-blue-600 px-2 py-1 bg-blue-50">生成中</span>
              <span v-else-if="s.status === 'failed'" class="text-xs text-red-500 px-2 py-1 bg-red-50">失败</span>
              <span v-else class="text-xs text-ink-400 px-2 py-1 bg-ink-50">待生成</span>
            </div>
          </div>

          <!-- 正文预览 -->
          <div v-if="s.content && s.status === 'completed'" class="mt-4 pl-14 border-l-2 border-ink-100 prose prose-sm max-w-none text-ink-700 leading-relaxed">
            <div v-html="renderMarkdown(s.content)"></div>
          </div>

          <!-- 错误信息 -->
          <div v-if="s.error" class="mt-3 pl-14 text-xs text-red-500">{{ s.error }}</div>

          <!-- 操作按钮 -->
          <div class="mt-4 pl-14 flex gap-2">
            <button
              v-if="s.status !== 'completed' && s.status !== 'processing'"
              class="px-4 py-2 text-sm bg-ink-900 text-white hover:bg-ink-800 transition-colors disabled:opacity-30"
              :disabled="generatingIdx === i"
              @click="generateSection(i)"
            >
              <span v-if="generatingIdx === i" class="inline-flex items-center gap-1">
                <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
                生成中...
              </span>
              <span v-else>{{ s.status === 'failed' ? '重新生成' : '生成正文' }}</span>
            </button>
            <button
              v-if="s.status === 'completed'"
              class="px-4 py-2 text-sm border border-ink-200 hover:border-ink-900 text-ink-700 hover:text-ink-900 transition-all"
              :disabled="generatingIdx === i"
              @click="generateSection(i)"
            >
              <span v-if="generatingIdx === i" class="inline-flex items-center gap-1">
                <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
                重新生成中...
              </span>
              <span v-else>重新生成</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 下载区 -->
      <div v-if="completedCount > 0" class="bg-ink-900 text-white p-6">
        <div class="flex items-center justify-between">
          <div>
            <div class="editorial-number text-white/40 text-xs mb-1">— Export —</div>
            <p class="text-sm text-white/80">已生成 {{ completedCount }}/{{ sections.length }} 章，可导出 .docx 文件</p>
            <p v-if="completedCount < sections.length" class="text-xs text-white/40 mt-1">未全部完成也可导出已生成的章节</p>
          </div>
          <button
            class="px-6 py-3 bg-white text-ink-900 text-sm tracking-[0.2em] uppercase hover:gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            :disabled="downloading"
            @click="downloadDocx"
          >
            <svg v-if="downloading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ downloading ? '导出中' : '下载 .docx' }}
            <span v-if="!downloading">↓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 图片反推 Modal -->
    <el-dialog v-model="showReverseModal" title="从图片提取风格" width="480px">
      <div class="space-y-4">
        <p class="text-sm text-ink-500">上传一张图片，AI 将分析其视觉风格并自动填入风格描述。</p>
        <div class="border-2 border-dashed border-ink-200 hover:border-ink-400 p-8 text-center cursor-pointer transition-all" @click="triggerReverseUpload">
          <input ref="reverseFileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onReverseFileChange" />
          <svg class="w-8 h-8 mx-auto mb-2 text-ink-400" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p class="text-sm text-ink-600">点击上传图片</p>
          <p class="text-xs text-ink-400 mt-1">JPG / PNG / WEBP</p>
        </div>
        <div v-if="reversing" class="flex items-center gap-2 text-sm text-primary-600">
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
          正在分析图片风格...
        </div>
        <div v-if="reverseResult" class="bg-ink-50 p-3 text-sm text-ink-700">{{ reverseResult }}</div>
      </div>
      <template #footer>
        <button class="px-4 py-2 text-sm text-white bg-ink-900 hover:bg-ink-800 transition-colors" :disabled="!reverseResult" @click="applyReverseResult">应用到风格</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  generateWordOutline,
  createWordWork,
  generateWordSection,
  downloadWordDocx,
  reverseStyle,
  type WordSection,
  type WordOutlineSection,
} from '@/api/word';

const step = ref(0);
const generatingOutline = ref(false);
const creating = ref(false);
const generatingIdx = ref<number | null>(null);
const downloading = ref(false);

const form = reactive({
  prompt: '',
  category: 'business',
  customCategory: '',
  style: 'academic',
  customStyle: '',
  language: 'zh',
  detailLevel: 'standard',
  sectionCount: 8,
});

const outline = ref<(WordOutlineSection & { _key: number })[]>([]);
const sections = ref<WordSection[]>([]);
const workId = ref<number | null>(null);

let keyCounter = 0;

// 图片反推
const showReverseModal = ref(false);
const reversing = ref(false);
const reverseResult = ref('');
const reverseFileInput = ref<HTMLInputElement | null>(null);

const categories = [
  { value: 'business', label: '商务' },
  { value: 'academic', label: '学术' },
  { value: 'product', label: '产品' },
  { value: 'education', label: '教育' },
  { value: 'marketing', label: '营销' },
  { value: 'personal', label: '个人' },
  { value: 'custom', label: '自定义' },
  { value: 'none', label: '无' },
];

const styles = [
  { value: 'business', label: '商务专业', desc: '正式严谨，逻辑清晰' },
  { value: 'minimal', label: '简洁明快', desc: '精炼，要点突出' },
  { value: 'academic', label: '学术严谨', desc: '引用规范，数据支撑' },
  { value: 'creative', label: '创意叙事', desc: '生动，故事性强' },
  { value: 'custom', label: '自定义', desc: '自由描述风格' },
  { value: 'none', label: '无', desc: '不限定，AI 自由发挥' },
];

const flowIntro = [
  { title: '生成大纲', desc: 'AI 根据主题生成章节结构，免费且可编辑' },
  { title: '逐章生成', desc: '按章节逐个生成正文，每章完成即可预览' },
  { title: '导出文档', desc: '全部或部分完成后，一键导出 .docx 文件' },
];

const completedCount = computed(() => sections.value.filter((s) => s.status === 'completed').length);
const overallProgress = computed(() => {
  if (sections.value.length === 0) return 0;
  return Math.round((completedCount.value / sections.value.length) * 100);
});

async function generateOutline() {
  if (form.prompt.trim().length < 5) {
    ElMessage.warning('请输入至少 5 个字符的主题');
    return;
  }
  generatingOutline.value = true;
  try {
    const res = await generateWordOutline({
      prompt: form.prompt,
      style: form.style,
      customStyle: form.customStyle,
      category: form.category,
      customCategory: form.customCategory,
      language: form.language,
      detailLevel: form.detailLevel,
      sectionCount: form.sectionCount,
    });
    outline.value = res.sections.map((s) => ({ ...s, _key: keyCounter++ }));
    step.value = 1;
    ElMessage.success(`已生成 ${res.sections.length} 个章节大纲`);
  } catch {
    // 错误由拦截器处理
  } finally {
    generatingOutline.value = false;
  }
}

function addSection() {
  outline.value.push({ title: '', summary: '', _key: keyCounter++ });
}

function removeSection(idx: number) {
  if (outline.value.length <= 1) return;
  outline.value.splice(idx, 1);
}

function moveSection(idx: number, dir: number) {
  const target = idx + dir;
  if (target < 0 || target >= outline.value.length) return;
  const tmp = outline.value[idx];
  outline.value[idx] = outline.value[target];
  outline.value[target] = tmp;
}

async function createWork() {
  creating.value = true;
  try {
    const validSections = outline.value
      .filter((s) => s.title.trim())
      .map((s) => ({ title: s.title.trim(), summary: s.summary.trim() }));
    if (validSections.length === 0) {
      ElMessage.warning('请至少填写一个章节标题');
      return;
    }
    const res = await createWordWork({
      prompt: form.prompt,
      style: form.style,
      customStyle: form.customStyle,
      category: form.category,
      customCategory: form.customCategory,
      language: form.language,
      detailLevel: form.detailLevel,
      sections: validSections,
    });
    workId.value = res.workId;
    sections.value = res.sections.map((s: any) => ({
      idx: s.idx,
      title: s.title,
      content: '',
      status: s.status,
      summary: s.content,
    }));
    step.value = 2;
    ElMessage.success('文档已创建，可以开始生成正文');
  } catch {
    // 错误由拦截器处理
  } finally {
    creating.value = false;
  }
}

async function generateSection(idx: number) {
  if (workId.value === null) return;
  generatingIdx.value = idx;
  try {
    const res = await generateWordSection(workId.value, idx);
    sections.value[idx].content = res.content;
    sections.value[idx].status = 'completed';
    sections.value[idx].error = null;
    ElMessage.success(`第 ${idx + 1} 章已生成`);
  } catch {
    sections.value[idx].status = 'failed';
    sections.value[idx].error = '生成失败，请重试';
  } finally {
    generatingIdx.value = null;
  }
}

async function downloadDocx() {
  if (workId.value === null) return;
  downloading.value = true;
  try {
    await downloadWordDocx(workId.value);
    ElMessage.success('文档已下载');
  } catch (e) {
    ElMessage.error((e as Error).message || '导出失败');
  } finally {
    downloading.value = false;
  }
}

function renderMarkdown(md: string): string {
  // 简易 markdown 渲染
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-ink-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-ink-900 mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-ink-900 mt-4 mb-2">$1</h1>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  return '<p class="mb-2">' + html + '</p>';
}

// 图片反推
function triggerReverseUpload() {
  reverseFileInput.value?.click();
}

async function onReverseFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  reversing.value = true;
  reverseResult.value = '';
  try {
    const res = await reverseStyle(file);
    reverseResult.value = res.style;
    ElMessage.success('风格分析完成');
  } catch {
    // 错误由拦截器处理
  } finally {
    reversing.value = false;
    input.value = '';
  }
}

function applyReverseResult() {
  if (!reverseResult.value) return;
  form.style = 'custom';
  form.customStyle = reverseResult.value;
  showReverseModal.value = false;
  reverseResult.value = '';
  ElMessage.success('风格已应用');
}
</script>

<style scoped>
.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}
.prose :deep(li) {
  margin-left: 1rem;
  list-style-type: disc;
}
.prose :deep(p) {
  margin-bottom: 0.5rem;
}
</style>
