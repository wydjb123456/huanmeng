<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- 页头 -->
    <div v-reveal class="mb-10 pb-6 border-b border-ink-200">
      <div class="editorial-number text-primary-500 text-xs tracking-[0.3em] uppercase mb-3">— Studio —</div>
      <h1 class="display-hero text-ink-900 text-5xl mb-2">AI 创作 <span class="script-accent text-7xl text-ink-900">工作室</span></h1>
      <p class="text-ink-500">先出大纲，再生成 — 你完全掌控每一页</p>
    </div>

    <!-- 步骤指示 -->
    <div class="mb-12 flex items-center gap-4 sm:gap-8">
      <div v-for="(s, i) in stepLabels" :key="i" class="flex items-center gap-4 sm:gap-8">
        <div class="flex items-center gap-2">
          <div
            class="editorial-number text-sm w-7 h-7 flex items-center justify-center border transition-all"
            :class="step === i ? 'border-ink-900 bg-ink-900 text-white' : step > i ? 'border-ink-900 text-ink-900' : 'border-ink-200 text-ink-300'"
          >{{ String(i + 1).padStart(2, '0') }}</div>
          <span
            class="text-sm tracking-wide hidden sm:block transition-colors"
            :class="step >= i ? 'text-ink-900' : 'text-ink-400'"
          >{{ s }}</span>
        </div>
        <div v-if="i < stepLabels.length - 1" class="h-px w-6 sm:w-12" :class="step > i ? 'bg-ink-900' : 'bg-ink-200'"></div>
      </div>
    </div>

    <!-- ============ Step 0：输入主题 + 配置 ============ -->
    <div v-if="step === 0" class="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-8">
      <div class="space-y-5">
        <!-- 模式切换：从主题生成 / 优化已有 PDF / 导入 Word 文档 -->
        <div class="flex border border-ink-200">
          <button
            class="flex-1 py-3 text-sm tracking-wide transition-all"
            :class="!pdfImport && !wordImport ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:text-ink-900'"
            @click="switchCreateMode('topic')"
          >从主题生成</button>
          <button
            class="flex-1 py-3 text-sm tracking-wide transition-all"
            :class="pdfImport ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:text-ink-900'"
            @click="switchCreateMode('pdf')"
          >优化已有 PDF</button>
          <button
            class="flex-1 py-3 text-sm tracking-wide transition-all"
            :class="wordImport ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:text-ink-900'"
            @click="switchCreateMode('word')"
          >导入 Word 文档</button>
        </div>

        <!-- PDF 上传区（仅 PDF 导入模式） -->
        <div v-if="pdfImport" class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">01 / Upload PDF</label>
          <div
            class="border-2 border-dashed border-ink-200 hover:border-ink-400 p-8 text-center cursor-pointer transition-all"
            @click="triggerPdfInput"
            @dragover.prevent
            @drop.prevent="onPdfDrop"
          >
            <input ref="pdfInput" type="file" accept="application/pdf" hidden @change="onPdfChange" />
            <template v-if="!pdfPages.length">
              <div class="text-4xl mb-3">📄</div>
              <p class="text-sm text-ink-600 mb-1">点击或拖拽上传 PDF</p>
              <p class="text-xs text-ink-400">最大 20MB，将提取每页作为参考</p>
            </template>
            <template v-else>
              <p class="text-sm text-ink-900 mb-3">已提取 {{ pdfPages.length }} 页</p>
              <div class="flex flex-wrap gap-2 justify-center">
                <div
                  v-for="page in pdfPages.slice(0, 6)"
                  :key="page.idx"
                  class="w-16 h-12 bg-ink-100 border border-ink-200 overflow-hidden"
                >
                  <img :src="page.imageUrl" alt="PDF 页面预览" loading="lazy" class="w-full h-full object-cover" />
                </div>
                <div v-if="pdfPages.length > 6" class="w-16 h-12 flex items-center justify-center text-xs text-ink-400">
                  +{{ pdfPages.length - 6 }}
                </div>
              </div>
              <p class="text-xs text-ink-400 mt-3">点击重新上传</p>
            </template>
          </div>
          <div v-if="extractingPdf" class="mt-3 flex items-center gap-2 text-sm text-primary-600">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            正在提取 PDF 页面...
          </div>
        </div>

        <!-- Word 上传区（仅 Word 导入模式） -->
        <div v-if="wordImport" class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">01 / Upload Word</label>
          <div
            class="border-2 border-dashed border-ink-200 hover:border-ink-400 p-8 text-center cursor-pointer transition-all"
            @click="triggerWordInput"
            @dragover.prevent
            @drop.prevent="onWordDrop"
          >
            <input ref="wordInput" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden @change="onWordChange" />
            <template v-if="!wordSlides.length">
              <div class="text-4xl mb-3">📝</div>
              <p class="text-sm text-ink-600 mb-1">点击或拖拽上传 .docx 文件</p>
              <p class="text-xs text-ink-400">最大 20MB，AI 将基于文档内容生成大纲</p>
            </template>
            <template v-else>
              <p class="text-sm text-ink-900 mb-3">已提取 {{ wordSlides.length }} 页大纲</p>
              <div class="space-y-1.5 max-h-40 overflow-y-auto text-left">
                <div
                  v-for="s in wordSlides.slice(0, 6)"
                  :key="s.idx"
                  class="text-xs text-ink-700 flex gap-2"
                >
                  <span class="editorial-number text-primary-500">{{ String(s.idx + 1).padStart(2, '0') }}</span>
                  <span class="truncate">{{ s.title }}</span>
                </div>
                <div v-if="wordSlides.length > 6" class="text-xs text-ink-400 text-center pt-1">
                  +{{ wordSlides.length - 6 }} 页...
                </div>
              </div>
              <p class="text-xs text-ink-400 mt-3">点击重新上传</p>
            </template>
          </div>
          <div v-if="wordExtracting" class="mt-3 flex items-center gap-2 text-sm text-primary-600">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ wordStage === 'extracting' ? '正在提取文档文本...' : 'AI 正在重构大纲...' }}
          </div>
        </div>

        <!-- 01 / Topic（非 PDF / Word 导入模式） -->
        <div v-if="!pdfImport && !wordImport" class="bg-white border border-ink-200/70 p-6">
          <div class="flex items-center justify-between mb-4">
            <label class="editorial-number text-ink-500 text-xs tracking-widest">01 / Topic</label>
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
          <textarea
            v-model="form.prompt"
            rows="5"
            class="w-full px-0 py-2 bg-transparent border-0 border-b border-ink-200 focus:border-ink-900 focus:ring-0 resize-none text-ink-900 placeholder-ink-300 transition-colors"
            placeholder="例如：为一家精品咖啡店制作商业计划书，包含品牌介绍、市场分析、菜单设计、财务预测、团队介绍等内容。"
          ></textarea>
          <!-- 优化建议 -->
          <div v-if="suggestions.length" class="mt-3 p-3 bg-primary-50/60 border border-primary-100">
            <div class="editorial-number text-primary-600 text-[10px] mb-1.5">— Suggestions —</div>
            <ul class="space-y-1">
              <li v-for="(s, i) in suggestions" :key="i" class="text-xs text-ink-600 flex gap-2">
                <span class="text-primary-500">·</span>{{ s }}
              </li>
            </ul>
          </div>
          <div class="flex items-center justify-between mt-3">
            <span class="text-xs text-ink-400">越详细大纲越精准</span>
            <button class="inline-flex items-center gap-1 text-xs text-ink-700 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all" @click="showExamples = !showExamples">
              {{ showExamples ? '收起' : '查看' }}示例
            </button>
          </div>
          <div v-if="showExamples" class="mt-4 space-y-2 pt-4 border-t border-ink-100">
            <button
              v-for="ex in examples"
              :key="ex"
              class="block w-full text-left px-3 py-2.5 border-l-2 border-ink-200 hover:border-ink-900 hover:bg-ink-50 text-sm text-ink-600 hover:text-ink-900 transition-all"
              @click="form.prompt = ex; showExamples = false"
            >{{ ex }}</button>
          </div>
        </div>

        <!-- 优化要求（仅 PDF 导入模式） -->
        <div v-if="pdfImport" class="bg-white border border-ink-200/70 p-6">
          <label class="editorial-number text-ink-500 text-xs tracking-widest mb-4 block">02 / Optimization</label>
          <textarea
            v-model="form.prompt"
            rows="3"
            class="w-full px-0 py-2 bg-transparent border-0 border-b border-ink-200 focus:border-ink-900 focus:ring-0 resize-none text-ink-900 placeholder-ink-300 transition-colors"
            placeholder="例如：重新设计为现代简约风格，优化排版与配色，保持内容不变"
          ></textarea>
          <p class="text-xs text-ink-400 mt-2">AI 将基于每页内容重新设计视觉风格</p>
        </div>

        <!-- 02 / Category -->
        <div class="bg-white border border-ink-200/70 p-6">
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
            placeholder="例如：年终总结、项目复盘、婚礼策划、旅行记录..."
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

        <!-- 04 / Setup -->
        <div class="bg-white border border-ink-200/70 p-6 space-y-5">
          <label class="editorial-number text-ink-500 text-xs tracking-widest block">04 / Setup</label>

          <!-- 页数 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-ink-600">页数</span>
              <span class="display-hero text-ink-900 text-lg">{{ form.pageCount }} <span class="text-xs text-ink-400">页</span></span>
            </div>
            <template v-if="pdfImport">
              <p class="text-xs text-ink-400">由 PDF 决定，将生成 {{ pdfPages.length }} 页（每页对应 PDF 一页）</p>
              <p class="text-[11px] text-amber-600 mt-2">PDF 导入仅支持精细模式</p>
            </template>
            <template v-else>
              <div class="flex gap-1.5 mb-3">
                <button
                  v-for="n in pageCountPresets"
                  :key="n"
                  class="flex-1 py-1.5 text-xs border transition-all"
                  :class="form.pageCount === n ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-600'"
                  @click="form.pageCount = n"
                >{{ n }}</button>
              </div>
              <input type="range" min="2" max="15" v-model.number="form.pageCount" class="w-full accent-ink-900" />
              <div class="flex justify-between text-[10px] text-ink-400 mt-1">
                <span>2</span><span>15</span>
              </div>
              <p v-if="wordImport" class="text-[11px] text-primary-600 mt-2">作为目标页数，实际由文档内容决定</p>
              <p v-else-if="form.pageCount !== 9" class="text-[11px] text-amber-600 mt-2">将自动使用精细模式（极速模式仅支持 9 页）</p>
            </template>
          </div>

          <!-- 长宽比 + 语言 + 详情 -->
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-ink-100">
            <div>
              <div class="text-xs text-ink-600 mb-2">长宽比</div>
              <div class="flex gap-1">
                <button
                  v-for="a in aspectRatios"
                  :key="a.value"
                  class="flex-1 py-1.5 text-xs border transition-all"
                  :class="form.aspectRatio === a.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-600'"
                  @click="form.aspectRatio = a.value"
                >{{ a.label }}</button>
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
            <div class="col-span-2">
              <div class="text-xs text-ink-600 mb-2">详情程度</div>
              <div class="flex gap-1">
                <button
                  v-for="d in detailLevels"
                  :key="d.value"
                  class="flex-1 py-1.5 text-xs border transition-all"
                  :class="form.detailLevel === d.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 text-ink-600'"
                  @click="form.detailLevel = d.value"
                >{{ d.label }}</button>
              </div>
            </div>
            <div class="col-span-2">
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
            <div class="col-span-2">
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
          </div>

          <!-- ISCS 国际风格(可选) -->
          <div class="mt-4 pt-4 border-t border-ink-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-ink-600">国际文化风格 <span class="text-ink-400">(可选,影响视觉与叙事)</span></span>
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
            <p v-if="form.styleTag" class="text-[11px] text-primary-600 mt-2">
              {{ iscsStyleMap[form.styleTag]?.design_philosophy }}
            </p>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="bg-ink-900 text-white p-6">
          <div class="editorial-number text-white/40 text-xs mb-2">— Next —</div>
          <p v-if="pdfImport" class="text-sm text-white/80 mb-6 leading-relaxed">
            将基于 PDF 每页内容，以「{{ form.style === 'custom' ? form.customStyle : form.style }}」风格重新设计 {{ pdfPages.length }} 页。
          </p>
          <p v-else-if="wordImport" class="text-sm text-white/80 mb-6 leading-relaxed">
            AI 将提取 Word 文档内容并重构为幻灯片大纲，上传后可直接编辑大纲再生成。
          </p>
          <p v-else class="text-sm text-white/80 mb-6 leading-relaxed">AI 将根据主题、用途和配置生成 {{ form.pageCount }} 页大纲。大纲免费、可任意编辑。</p>
          <button
            v-if="!wordImport"
            class="w-full py-3.5 bg-white text-ink-900 text-sm tracking-[0.2em] uppercase hover:gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            :disabled="pdfImport ? (!pdfPages.length || !form.prompt.trim() || extractingPdf) : (!form.prompt.trim() || generatingOutline)"
            @click="pdfImport ? proceedToMode() : generateOutline()"
          >
            <svg v-if="generatingOutline || extractingPdf" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ pdfImport ? '下一步：选择模式' : (generatingOutline ? '生成中' : '生成大纲') }}
            <span v-if="!generatingOutline && !extractingPdf">→</span>
          </button>
          <p v-else class="text-xs text-white/50 text-center">📝 请在上方上传 .docx 文件</p>
        </div>
      </div>

      <div class="bg-white border border-ink-200/70 p-8 min-h-[500px] flex flex-col items-center justify-center text-center relative overflow-hidden">
        <img src="/images/watercolor-flowers.webp" alt="" class="absolute inset-0 w-full h-full object-cover opacity-10" onerror="this.style.display='none'" />
        <div class="relative">
          <div class="editorial-number text-primary-400 text-sm mb-4">— Workflow —</div>
          <h3 class="display-hero text-ink-900 text-3xl mb-4">全新的创作流程</h3>
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
          <p class="text-sm text-ink-500 mt-1">
            {{ outline.length }} 页 · 可增删改排序 · 免费
            <span v-if="wordImport" class="ml-2 text-primary-600">· 来自 Word 文档</span>
            <span v-else-if="pdfImport" class="ml-2 text-amber-600">· 来自 PDF 导入</span>
          </p>
        </div>
        <div class="flex gap-3 items-center">
          <button class="text-sm text-ink-600 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all" @click="step = 0">← 返回</button>
          <button class="inline-flex items-center gap-1 text-sm text-ink-700 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all" @click="addSlide">+ 添加页</button>
          <button
            v-if="wordImport && cachedWordFile"
            class="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 border-b border-primary-300 hover:border-primary-700 pb-0.5 transition-all disabled:opacity-40"
            :disabled="wordExtracting"
            @click="regenerateFromWord"
          >
            <svg v-if="wordExtracting" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            <span>{{ wordExtracting ? '生成中' : '从文档重新生成' }}</span>
          </button>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="(slide, i) in outline"
          :key="slide._key"
          class="bg-white border border-ink-200/70 p-5 flex gap-5 group"
        >
          <div class="editorial-number text-primary-500 text-lg flex-shrink-0 w-10 pt-1">{{ String(i + 1).padStart(2, '0') }}</div>
          <div class="flex-1 space-y-3">
            <input
              v-model="slide.title"
              class="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-ink-900 focus:ring-0 font-serif-cn text-lg text-ink-900 transition-colors"
              placeholder="页面标题"
            />
            <textarea
              v-model="slide.pointsText"
              rows="2"
              class="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-ink-400 focus:ring-0 text-sm text-ink-600 placeholder-ink-300 transition-colors resize-none"
              placeholder="要点（每行一条）"
            ></textarea>
          </div>
          <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button :disabled="i === 0" class="text-ink-400 hover:text-ink-900 disabled:opacity-20 p-1" @click="moveSlide(i, -1)" aria-label="上移">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M5 15l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button :disabled="i === outline.length - 1" class="text-ink-400 hover:text-ink-900 disabled:opacity-20 p-1" @click="moveSlide(i, 1)" aria-label="下移">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M19 9l-7 7-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button :disabled="outline.length <= 2" class="text-ink-400 hover:text-red-500 disabled:opacity-20 p-1" @click="removeSlide(i)" aria-label="删除">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <button
          class="inline-flex items-center gap-2 text-white bg-ink-900 px-6 py-3 hover:gap-4 transition-all text-sm tracking-[0.2em] uppercase"
          @click="step = 2"
        >下一步：选择模式<span>→</span></button>
      </div>
    </div>

    <!-- ============ Step 2：选模式 ============ -->
    <div v-else-if="step === 2" class="max-w-3xl mx-auto">
      <div class="text-center mb-10 pb-6 border-b border-ink-200">
        <div class="editorial-number text-primary-500 text-xs mb-2">— Mode —</div>
        <h2 class="display-hero text-ink-900 text-3xl mb-2">选择生成模式</h2>
        <p class="text-sm text-ink-500">{{ outline.length }} 页 · 主题：{{ form.prompt.slice(0, 40) }}{{ form.prompt.length > 40 ? '...' : '' }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          v-for="m in modeOptions"
          :key="m.value"
          class="text-left p-6 border-2 transition-all relative"
          :class="[
            isModeDisabled(m.value) ? 'border-ink-100 opacity-40 cursor-not-allowed' : (form.mode === m.value ? 'border-ink-900 bg-white' : 'border-ink-200 hover:border-ink-400 bg-white/50')
          ]"
          :disabled="isModeDisabled(m.value)"
          @click="!isModeDisabled(m.value) && (form.mode = m.value)"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="editorial-number text-xs" :class="form.mode === m.value ? 'text-ink-900' : 'text-ink-400'">{{ m.label }}</div>
            <div v-if="form.mode === m.value" class="w-4 h-4 bg-ink-900 rounded-full flex items-center justify-center">
              <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3"/></svg>
            </div>
          </div>
          <h3 class="font-serif-cn text-2xl text-ink-900 mb-3">{{ m.title }}</h3>
          <p class="text-sm text-ink-600 mb-4 leading-relaxed">{{ m.desc }}</p>
          <div v-if="isModeDisabled(m.value)" class="text-xs text-amber-600 mb-2">⚠ 仅支持 9 页，当前 {{ outline.length }} 页</div>
          <div class="flex items-center justify-between pt-4 border-t border-ink-100">
            <div>
              <div class="editorial-number text-ink-400 text-[10px] mb-0.5">耗时</div>
              <div class="text-sm text-ink-700">{{ m.time }}</div>
            </div>
            <div class="text-right">
              <div class="editorial-number text-ink-400 text-[10px] mb-0.5">Cost</div>
              <div class="text-xl font-light text-ink-900">{{ computeCost(m.value) }} <span class="text-xs text-ink-500">积分</span></div>
            </div>
          </div>
        </button>
      </div>

      <div class="bg-ink-900 text-white p-6 flex items-center justify-between">
        <div>
          <div class="editorial-number text-white/40 text-xs mb-1">Total</div>
          <div class="text-2xl font-light">{{ computeCost(form.mode) }} <span class="text-sm text-white/60">积分</span></div>
          <div class="text-xs text-white/50 mt-1">余额 {{ userStore.userInfo?.balance ?? 0 }}</div>
        </div>
        <div class="flex gap-3">
          <button class="text-sm text-white/70 hover:text-white border-b border-white/30 hover:border-white pb-0.5 transition-all" @click="step = 1">← 返回</button>
          <button
            class="inline-flex items-center gap-2 bg-white text-ink-900 px-6 py-3 hover:gap-4 transition-all text-sm tracking-[0.2em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="(userStore.userInfo?.balance ?? 0) < computeCost(form.mode)"
            @click="startGenerate"
          >
            {{ (userStore.userInfo?.balance ?? 0) < computeCost(form.mode) ? '积分不足' : '开始生成' }}
            <span v-if="(userStore.userInfo?.balance ?? 0) >= computeCost(form.mode)">→</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Step 3：生成中 ============ -->
    <div v-else-if="step === 3" class="max-w-2xl mx-auto py-8">
      <div class="text-center mb-12">
        <div class="editorial-number text-primary-500 text-xs mb-4">— In Progress —</div>
        <h3 class="display-hero text-ink-900 text-4xl mb-3">{{ form.mode === 'fast' ? '极速创作中' : '精细创作中' }}</h3>
        <p class="text-sm text-ink-500">{{ form.mode === 'fast' ? 'AI 绘制整张网格图，约 3-5 分钟' : `${slides.length} 页并行生成，约 3-5 分钟` }}</p>
      </div>

      <!-- 整体进度 -->
      <div class="mb-10">
        <div class="flex items-center justify-between mb-2">
          <span class="editorial-number text-ink-500 text-xs">Overall</span>
          <span class="display-hero text-ink-900 text-2xl">{{ overallProgress }}<span class="text-sm">%</span></span>
        </div>
        <div class="h-px bg-ink-200 relative">
          <div class="absolute top-0 left-0 h-full bg-ink-900 transition-all duration-500" :style="{ width: overallProgress + '%' }"></div>
        </div>
      </div>

      <!-- 精细模式：每页进度 -->
      <div v-if="form.mode === 'fine'" class="space-y-3 border-t border-ink-200 pt-8">
        <div v-for="(s, i) in slides" :key="s.id" class="flex items-center gap-4">
          <div class="editorial-number text-sm w-8" :class="s.status === 'completed' ? 'text-ink-900' : s.status === 'processing' ? 'text-primary-600' : s.status === 'failed' ? 'text-red-500' : 'text-ink-300'">
            {{ String(i + 1).padStart(2, '0') }}
          </div>
          <div class="flex-1 truncate font-serif-cn text-sm" :class="s.status === 'pending' ? 'text-ink-400' : 'text-ink-900'">{{ s.title }}</div>
          <div class="text-xs tracking-wide" :class="s.status === 'completed' ? 'text-ink-700' : s.status === 'processing' ? 'text-primary-600' : s.status === 'failed' ? 'text-red-500' : 'text-ink-400'">
            {{ s.status === 'completed' ? '完成' : s.status === 'processing' ? '生成中' : s.status === 'failed' ? '失败' : '等待' }}
          </div>
          <svg v-if="s.status === 'processing'" class="w-3 h-3 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
          <svg v-else-if="s.status === 'completed'" class="w-4 h-4 text-ink-900" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <svg v-else-if="s.status === 'failed'" class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>
        </div>
      </div>
    </div>

    <!-- ============ Step 4：失败 ============ -->
    <div v-else-if="step === 4" class="max-w-xl mx-auto py-20 text-center">
      <div class="editorial-number text-red-400 text-xs mb-6">— Error —</div>
      <h3 class="display-hero text-ink-900 text-4xl mb-3">生成失败</h3>
      <p class="text-sm text-ink-500 mb-2 max-w-sm mx-auto">{{ errorMsg }}</p>
      <p class="text-xs text-ink-400 mb-10">积分已退还</p>
      <div class="flex gap-6 justify-center">
        <button class="inline-flex items-center gap-2 text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-4 transition-all text-sm tracking-wide" @click="step = 2">重新选择模式<span>→</span></button>
        <button class="text-sm text-ink-500 hover:text-ink-900 transition-colors" @click="resetAll">从头开始</button>
      </div>
    </div>

    <!-- ============ Step 5：结果 ============ -->
    <div v-else-if="step === 5" class="space-y-6">
      <div class="flex items-end justify-between pb-6 border-b border-ink-200">
        <div>
          <div class="editorial-number text-emerald-600 text-xs mb-2">— Completed —</div>
          <h2 class="display-hero text-ink-900 text-3xl">生成完成</h2>
          <p class="text-sm text-ink-500 mt-1">{{ slides.length }} 页 · {{ form.mode === 'fast' ? '极速模式' : '精细模式（可单页重生成）' }}</p>
        </div>
        <div class="flex gap-4">
          <button class="inline-flex items-center gap-2 text-white bg-ink-900 px-5 py-3 hover:gap-4 transition-all text-sm tracking-[0.2em] uppercase" @click="downloadPdf">
            下载 PDF <span>↓</span>
          </button>
          <button class="inline-flex items-center gap-2 text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-4 transition-all text-sm tracking-[0.2em] uppercase" @click="showTutorial = true">
            转 PPT 教程 <span>→</span>
          </button>
        </div>
      </div>

      <!-- 页面网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(s, i) in slides"
          :key="s.id"
          class="relative group bg-ink-100 overflow-hidden"
        >
          <div class="aspect-video relative overflow-hidden">
            <img v-if="s.imageUrl" :src="s.imageUrl" :alt="s.title" loading="lazy" class="w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-8 h-8 text-ink-300 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            </div>
            <!-- 编号 -->
            <div class="absolute top-3 left-3 editorial-number text-white/80 text-xs">Nº {{ String(i + 1).padStart(2, '0') }}</div>
            <!-- 状态 -->
            <div v-if="s.status === 'processing'" class="absolute top-3 right-3">
              <span class="badge bg-amber-500/90 text-white backdrop-blur">
                <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
                重生成中
              </span>
            </div>
            <div v-else-if="s.status === 'failed'" class="absolute top-3 right-3">
              <span class="badge bg-red-500/90 text-white backdrop-blur">失败</span>
            </div>
          </div>
          <!-- 标题 + 操作 -->
          <div class="p-4 bg-white border-t border-ink-100">
            <div class="font-serif-cn text-ink-900 text-base mb-2 truncate">{{ s.title }}</div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-ink-400">{{ s.content?.split('\n')[0] || '—' }}</span>
              <div class="flex gap-2">
                <button
                  v-if="form.mode === 'fine' && s.status !== 'processing'"
                  class="text-ink-400 hover:text-ink-900 transition-colors p-1"
                  :title="`重生成（${pptBaseCost(form.resolution, form.quality)} 积分）`"
                  @click="regenerateSlide(s.id)"
                  aria-label="重生成"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <a
                  v-if="s.imageUrl"
                  :href="s.imageUrl"
                  download
                  class="text-ink-400 hover:text-ink-900 transition-colors p-1"
                  aria-label="下载单页"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
                <button
                  v-if="slides.length > 1"
                  class="text-ink-400 hover:text-red-500 transition-colors p-1"
                  @click="deleteSlide(s.id)"
                  aria-label="删除"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-center pt-8">
        <button class="text-sm text-ink-500 hover:text-ink-900 border-b border-ink-300 hover:border-ink-900 pb-0.5 transition-all" @click="resetAll">创作新作品</button>
      </div>
    </div>

    <!-- 教程弹窗 -->
    <transition name="fade">
      <div v-if="showTutorial" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm" @click.self="showTutorial = false">
        <div class="bg-white max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div class="px-8 py-6 border-b border-ink-200 flex items-center justify-between">
            <div>
              <div class="editorial-number text-primary-500 text-xs mb-1">— Tutorial —</div>
              <h3 class="display-hero text-ink-900 text-2xl">PDF 转 PPT 教程</h3>
            </div>
            <button class="text-ink-400 hover:text-ink-900 transition-colors p-1" @click="showTutorial = false" aria-label="关闭">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="p-8 overflow-y-auto space-y-6 text-sm text-ink-700 leading-relaxed">
            <div v-for="(t, i) in tutorialSteps" :key="i" class="flex gap-5">
              <div class="editorial-number text-primary-500 text-lg flex-shrink-0 w-8">{{ String(i + 1).padStart(2, '0') }}</div>
              <div class="flex-1 border-b border-ink-100 pb-5">
                <p class="font-serif-cn text-lg text-ink-900 mb-1">{{ t.title }}</p>
                <p class="text-ink-600">{{ t.desc }}</p>
              </div>
            </div>
          </div>
          <div class="px-8 py-4 border-t border-ink-200 bg-ink-50 flex justify-end">
            <button class="inline-flex items-center gap-2 text-ink-900 border-b border-ink-900 pb-0.5 hover:gap-4 transition-all text-sm tracking-wide" @click="showTutorial = false">
              我知道了<span>→</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 提示词库弹窗 -->
    <PromptLibrary :visible="showLibrary" type="ppt" @close="showLibrary = false" @select="onLibrarySelect" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onUnmounted, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useWorksStore } from '@/stores/works';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';
import { uploadPdf, uploadWord } from '@/api/upload';
import { getStyles, type StyleVariantSummary } from '@/api/iscs';
import PromptLibrary from '@/components/PromptLibrary.vue';
import StyleReverseButton from '@/components/StyleReverseButton.vue';

const route = useRoute();
const userStore = useUserStore();
const worksStore = useWorksStore();

// ISCS 风格列表
const iscsStyles = ref<StyleVariantSummary[]>([]);
const iscsStyleMap = ref<Record<string, StyleVariantSummary>>({});
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

  // 恢复进行中的 PPT 生成任务
  const aw = worksStore.activeWork;
  if (aw && aw.type === 'ppt') {
    workId.value = aw.workId;
    slides.value = aw.slides;
    overallProgress.value = aw.progress;
    if (aw.status === 'completed') {
      step.value = 5;
      generating.value = false;
    } else if (aw.status === 'failed') {
      step.value = 4;
      errorMsg.value = aw.error;
      generating.value = false;
    } else {
      step.value = 3;
      generating.value = true;
    }
  }
  // 同步 store 状态变化到本地
  watch(() => worksStore.activeWork, (aw) => {
    if (!aw || aw.type !== 'ppt') return;
    workId.value = aw.workId;
    slides.value = aw.slides;
    overallProgress.value = aw.progress;
    if (aw.status === 'completed') {
      step.value = 5;
      generating.value = false;
    } else if (aw.status === 'failed') {
      step.value = 4;
      errorMsg.value = aw.error;
      generating.value = false;
    }
  }, { deep: true });

  try {
    const data: any = await getStyles();
    iscsStyles.value = data.styles || [];
    iscsStyleMap.value = Object.fromEntries(iscsStyles.value.map((s) => [s.code, s]));
  } catch {
    // 静默失败,不影响核心流程
  }
});
const showExamples = ref(false);
const showTutorial = ref(false);
const enhancing = ref(false);
const showLibrary = ref(false);
const suggestions = ref<string[]>([]);

// 步骤：0 输入 → 1 大纲 → 2 模式 → 3 生成中 → 4 失败 → 5 结果
const step = ref(0);
const stepLabels = ['主题', '大纲', '模式', '生成', '完成'];

const form = reactive({
  prompt: '',
  style: 'business',
  customStyle: '',
  mode: 'fine',
  category: 'business',
  customCategory: '',
  language: 'zh',
  detailLevel: 'standard',
  aspectRatio: '16:9',
  pageCount: 9,
  resolution: '2K',   // 分辨率：1K/2K(默认)/4K
  quality: 'high',     // 渲染质量：low/medium/high(默认)
  styleTag: '' as string,  // ISCS 国际风格标签(可选)
});

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

const examples = [
  '为一家精品咖啡店制作商业计划书，包含品牌介绍、市场分析、菜单设计、财务预测、团队介绍',
  '学术报告：人工智能在医疗领域的应用与挑战，包含研究背景、方法、结果、讨论、结论',
  '产品发布会演示：新款智能手机，包含产品亮点、技术参数、价格、销售策略',
];

const styles = [
  { value: 'business', label: '商务专业', desc: '蓝白配色，正式严谨' },
  { value: 'minimal', label: '现代简约', desc: '大量留白，极简几何' },
  { value: 'creative', label: '活泼创意', desc: '鲜艳色彩，动态布局' },
  { value: 'academic', label: '学术严谨', desc: '衬线字体，数据图表' },
  { value: 'custom', label: '自定义', desc: '自由描述风格' },
  { value: 'none', label: '无', desc: '不限定，AI 自由发挥' },
];

const categories = [
  { value: 'business', label: '商业计划', icon: '📊' },
  { value: 'academic', label: '学术报告', icon: '🎓' },
  { value: 'product', label: '产品发布', icon: '🚀' },
  { value: 'education', label: '教学课件', icon: '📚' },
  { value: 'marketing', label: '营销推广', icon: '✨' },
  { value: 'personal', label: '个人作品', icon: '👤' },
  { value: 'custom', label: '自定义', icon: '✎' },
  { value: 'none', label: '无', icon: '∅' },
];

const pageCountPresets = [6, 9, 12];

const aspectRatios = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '9:16', label: '9:16' },
];

const languages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'EN' },
  { value: 'bilingual', label: '双语' },
];

const detailLevels = [
  { value: 'brief', label: '简洁' },
  { value: 'standard', label: '标准' },
  { value: 'detailed', label: '详细' },
];

const modeOptions = [
  {
    value: 'fast',
    label: 'FAST MODE',
    title: '极速模式',
    desc: '生成 1 张 3×3 网格图后切分为 9 页。速度快、费用低，但每页分辨率有限，无法单页重生成。',
    time: '3-5 分钟',
  },
  {
    value: 'fine',
    label: 'FINE MODE',
    title: '精细模式',
    desc: '每页独立调用 API 生成，分辨率高、质量好。支持单页重生成和删除，页数 2-15 自由控制。',
    time: '3-5 分钟（并行）',
  },
];

const flowIntro = [
  { title: '生成大纲', desc: 'AI 根据你的主题自动生成 6-12 页大纲，包含标题与要点' },
  { title: '编辑大纲', desc: '增删页面、修改标题与要点、自由排序，完全掌控内容结构' },
  { title: '选择模式', desc: '极速模式（省钱快）或精细模式（质量高、可单页重生成）' },
  { title: '生成下载', desc: '并行生成所有页面，完成后下载 PDF 或单独保存某页' },
];

interface OutlineSlide {
  _key: number;
  title: string;
  pointsText: string; // 多行文本，每行一条要点
  points: string[]; // 计算属性，提交时用
}

const outline = ref<OutlineSlide[]>([]);
const slides = ref<any[]>([]);
let slideKeyCounter = 0;

const generatingOutline = ref(false);
const generating = ref(false);
const errorMsg = ref('');
const workId = ref<number | null>(null);

// PDF 导入相关状态
const pdfImport = ref(false);
const pdfPages = ref<{ idx: number; imageUrl: string; title: string }[]>([]);
const extractingPdf = ref(false);
const pdfInput = ref<HTMLInputElement>();

// Word 导入相关状态
const wordImport = ref(false);
const wordSlides = ref<{ idx: number; title: string; points: string[] }[]>([]);
const wordExtracting = ref(false);
const wordInput = ref<HTMLInputElement>();
// 缓存已上传的 Word 文件，支持基于风格/分类调整后重新生成大纲
const cachedWordFile = ref<File | null>(null);
// 分阶段进度：idle → extracting(提取文本) → generating(AI 重构大纲)
const wordStage = ref<'idle' | 'extracting' | 'generating'>('idle');

const overallProgress = ref(0);

const tutorialSteps = [
  { title: '下载 PDF 文件', desc: '点击上方"下载 PDF"按钮，保存到本地' },
  { title: '打开 WPS Office', desc: '新建或打开 WPS 演示文档' },
  { title: '使用"图片转可编辑"功能', desc: '在 WPS 中插入 PDF 页面，使用"图片转可编辑"功能将图片转为可编辑的 PPT 元素' },
  { title: '编辑与保存', desc: '调整文字、布局后保存为 .pptx 文件' },
];

const PPT_COST_MATRIX: Record<string, Record<string, number>> = {
  '1K': { low: 5, medium: 8, high: 15 },
  '2K': { low: 8, medium: 12, high: 20 },
  '4K': { low: 12, medium: 18, high: 30 },
};

function pptBaseCost(resolution: string, quality: string): number {
  return PPT_COST_MATRIX[resolution]?.[quality] ?? 20;
}

function computeCost(mode: string): number {
  if (mode === 'fast') return pptBaseCost(form.resolution, form.quality) + 20;
  return pptBaseCost(form.resolution, form.quality) * Math.max(2, Math.min(15, outline.value.length));
}

function isModeDisabled(mode: string): boolean {
  if (pdfImport.value) return mode === 'fast';
  return mode === 'fast' && outline.value.length !== 9;
}

// 页数非 9 时自动切到精细模式
watch(() => form.pageCount, (n) => {
  if (n !== 9 && form.mode === 'fast') {
    form.mode = 'fine';
  }
});

// 大纲编辑后页数变化也自动切换
watch(() => outline.value.length, (n) => {
  if (n !== 9 && form.mode === 'fast') {
    form.mode = 'fine';
  }
});

async function enhancePrompt() {
  if (!form.prompt.trim()) {
    ElMessage.warning('请先输入主题描述');
    return;
  }
  enhancing.value = true;
  suggestions.value = [];
  try {
    const data: any = await request.post('/works/prompt/enhance', {
      input: form.prompt,
      type: 'ppt',
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

// ===== 模式切换 / PDF / Word 导入功能 =====
function switchCreateMode(mode: 'topic' | 'pdf' | 'word') {
  if (mode === 'pdf') {
    pdfImport.value = true;
    wordImport.value = false;
    form.mode = 'fine';
    pdfPages.value = [];
    outline.value = [];
    wordSlides.value = [];
    cachedWordFile.value = null;
  } else if (mode === 'word') {
    wordImport.value = true;
    pdfImport.value = false;
    wordSlides.value = [];
    outline.value = [];
    pdfPages.value = [];
    // Word 导入不强制精细模式 —— 用户可选极速(若 9 页)或精细
  } else {
    pdfImport.value = false;
    wordImport.value = false;
    pdfPages.value = [];
    wordSlides.value = [];
    cachedWordFile.value = null;
  }
}

async function handlePdfUpload(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning('PDF 文件不能超过 20MB');
    return;
  }
  extractingPdf.value = true;
  try {
    const data = await uploadPdf(file);
    pdfPages.value = data.pages;
    form.pageCount = data.pageCount;
    // 自动生成 outline 占位（供 DTO 校验通过）
    outline.value = data.pages.map((p) => ({
      _key: slideKeyCounter++,
      title: p.title,
      pointsText: '',
      points: [],
    }));
    if (data.truncated) {
      ElMessage.warning(`PDF 共 ${data.originalCount} 页，已截断到前 ${data.pageCount} 页`);
    } else {
      ElMessage.success(`已提取 ${data.pageCount} 页`);
    }
  } catch {
    // 错误已由拦截器处理
  } finally {
    extractingPdf.value = false;
  }
}

function triggerPdfInput() {
  pdfInput.value?.click();
}

function onPdfChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.[0]) handlePdfUpload(target.files[0]);
  target.value = '';
}

function onPdfDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type === 'application/pdf') handlePdfUpload(file);
}

async function handleWordUpload(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning('Word 文件不能超过 20MB');
    return;
  }
  cachedWordFile.value = file;
  await processWordFile(file);
}

async function regenerateFromWord() {
  if (!cachedWordFile.value) {
    ElMessage.warning('请先上传 Word 文档');
    return;
  }
  await processWordFile(cachedWordFile.value, true);
}

async function processWordFile(file: File, isRegenerate = false) {
  wordExtracting.value = true;
  wordStage.value = 'extracting';
  // mammoth 提取很快(1-3秒)，2秒后切换到"AI 重构"阶段提示
  const stageTimer = setTimeout(() => {
    if (wordStage.value === 'extracting') wordStage.value = 'generating';
  }, 2000);

  try {
    const data = await uploadWord(file, {
      style: form.style,
      customStyle: form.style === 'custom' ? form.customStyle : undefined,
      language: form.language,
      detailLevel: form.detailLevel,
      pageCount: form.pageCount,
      category: form.category,
      customCategory: form.category === 'custom' ? form.customCategory : undefined,
    });
    wordSlides.value = data.slides;
    // 直接填充 outline —— 这是与 PDF 导入的关键差异（拿到真实大纲，非占位）
    outline.value = data.slides.map((s) => ({
      _key: slideKeyCounter++,
      title: s.title,
      pointsText: s.points.join('\n'),
      points: s.points,
    }));
    form.pageCount = data.slideCount;
    // 若 prompt 为空，用首张标题作默认主题
    if (!form.prompt.trim() && data.slides.length > 0) {
      form.prompt = data.slides[0].title;
    }
    if (data.textTruncated) {
      ElMessage.warning('文档内容较长，已截取前 8000 字进行分析');
    }
    if (data.truncated) {
      ElMessage.warning(`文档共生成 ${data.originalCount} 页大纲，已截断到前 ${data.slideCount} 页`);
    }
    if (!data.truncated && !data.textTruncated) {
      ElMessage.success(isRegenerate ? `已重新生成 ${data.slideCount} 页大纲` : `已提取 ${data.slideCount} 页大纲`);
    }
    // 跳到 step 1（大纲编辑器）—— 大纲已就绪，用户可审核/调整
    step.value = 1;
  } catch {
    // 错误已由拦截器处理
  } finally {
    clearTimeout(stageTimer);
    wordExtracting.value = false;
    wordStage.value = 'idle';
  }
}

function triggerWordInput() {
  wordInput.value?.click();
}

function onWordChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.[0]) handleWordUpload(target.files[0]);
  target.value = '';
}

function onWordDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    const isDocx = file.name.toLowerCase().endsWith('.docx')
      || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isDocx) handleWordUpload(file);
    else ElMessage.warning('请上传 .docx 格式的 Word 文件');
  }
}

function proceedToMode() {
  if (!pdfPages.value.length) {
    ElMessage.warning('请先上传 PDF');
    return;
  }
  if (!form.prompt.trim()) {
    ElMessage.warning('请填写优化要求');
    return;
  }
  step.value = 2;
}

async function generateOutline() {
  if (!form.prompt.trim()) {
    ElMessage.warning('请输入主题描述');
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
  generatingOutline.value = true;
  try {
    const data: any = await request.post('/works/outline', {
      prompt: form.prompt,
      style: form.style,
      customStyle: form.style === 'custom' ? form.customStyle : undefined,
      category: form.category,
      customCategory: form.category === 'custom' ? form.customCategory : undefined,
      language: form.language,
      detailLevel: form.detailLevel,
      pageCount: form.pageCount,
      styleTag: form.styleTag || undefined,
    });
    outline.value = (data.slides || []).map((s: any) => ({
      _key: slideKeyCounter++,
      title: s.title || '',
      pointsText: (s.points || []).join('\n'),
      points: s.points || [],
    }));
    if (outline.value.length === 0) {
      ElMessage.warning('大纲为空，请换个主题重试');
      return;
    }
    step.value = 1;
    ElMessage.success(`已生成 ${outline.value.length} 页大纲`);
  } catch {
    // 错误已由拦截器处理
  } finally {
    generatingOutline.value = false;
  }
}

function addSlide() {
  if (outline.value.length >= 15) {
    ElMessage.warning('最多 15 页');
    return;
  }
  outline.value.push({
    _key: slideKeyCounter++,
    title: '新页面',
    pointsText: '',
    points: [],
  });
}

function removeSlide(i: number) {
  if (outline.value.length <= 2) {
    ElMessage.warning('至少保留 2 页');
    return;
  }
  outline.value.splice(i, 1);
}

function moveSlide(i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= outline.value.length) return;
  [outline.value[i], outline.value[j]] = [outline.value[j], outline.value[i]];
}

async function startGenerate() {
  const cost = computeCost(form.mode);
  if ((userStore.userInfo?.balance ?? 0) < cost) {
    ElMessage.warning('积分不足');
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
  step.value = 3;
  generating.value = true;

  try {
    const payload = {
      prompt: form.prompt,
      style: form.style,
      customStyle: form.style === 'custom' ? form.customStyle : undefined,
      mode: form.mode,
      category: form.category,
      customCategory: form.category === 'custom' ? form.customCategory : undefined,
      language: form.language,
      detailLevel: form.detailLevel,
      aspectRatio: form.aspectRatio,
      resolution: form.resolution,
      quality: form.quality,
      styleTag: form.styleTag || undefined,
      outline: outline.value.map((s) => ({
        title: s.title.trim() || '未命名',
        points: s.pointsText.split('\n').map((p) => p.trim()).filter(Boolean),
      })),
      pdfImport: pdfImport.value,
      referenceImages: pdfImport.value ? pdfPages.value.map((p) => p.imageUrl) : undefined,
    };
    const data: any = await request.post('/works/generate', payload);
    workId.value = data.workId;
    startPolling();
  } catch {
    step.value = 4;
    errorMsg.value = '提交失败，请稍后重试';
    generating.value = false;
  }
}

function startPolling() {
  if (workId.value) {
    worksStore.setActiveWork(workId.value, 'ppt');
  }
}

async function regenerateSlide(slideId: number) {
  const perSlideCost = pptBaseCost(form.resolution, form.quality);
  try {
    await ElMessageBox.confirm(`重生成此页将消耗 ${perSlideCost} 积分，确认？`, '单页重生成', {
      type: 'warning',
      confirmButtonText: '确认重生成',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  try {
    await request.post(`/works/${workId.value}/slides/${slideId}/regenerate`);
    ElMessage.success('已提交重生成');
    userStore.fetchUserInfo();
  } catch {
    // 错误已由拦截器处理
  }
}

async function deleteSlide(slideId: number) {
  try {
    await ElMessageBox.confirm('删除此页后不可恢复，PDF 也会重建，确认？', '删除页面', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  try {
    await request.delete(`/works/${workId.value}/slides/${slideId}`);
    ElMessage.success('已删除');
    // 刷新状态
    const data: any = await request.get(`/works/${workId.value}/status`);
    slides.value = data.slides || [];
  } catch {
    // 错误已由拦截器处理
  }
}

function downloadPdf() {
  if (workId.value) {
    window.open(`/api/works/${workId.value}/download`, '_blank');
  }
}

function reset() {
  workId.value = null;
  overallProgress.value = 0;
  errorMsg.value = '';
  slides.value = [];
  generating.value = false;
  worksStore.clear();
}

function resetAll() {
  reset();
  step.value = 0;
  outline.value = [];
  pdfPages.value = [];
  pdfImport.value = false;
  wordSlides.value = [];
  wordImport.value = false;
}

onUnmounted(() => {
  // 轮询由 store 管理，组件卸载时不停止
});
</script>
