<template>
  <div class="style-reverse-button">
    <button
      type="button"
      class="text-xs text-primary-600 hover:text-primary-700 border-b border-primary-300 hover:border-primary-600 pb-0.5 transition-all"
      :disabled="loading"
      @click="triggerUpload"
    >
      <span v-if="loading" class="inline-flex items-center gap-1">
        <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
        分析中...
      </span>
      <span v-else>从图片提取风格 →</span>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { reverseStyle } from '@/api/word';

const emit = defineEmits<{
  (e: 'reverse', style: string): void;
}>();

const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function triggerUpload() {
  fileInput.value?.click();
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  loading.value = true;
  try {
    const res = await reverseStyle(file);
    emit('reverse', res.style);
    ElMessage.success('风格已提取，已填入自定义风格');
  } catch {
    // 错误由拦截器处理
  } finally {
    loading.value = false;
    input.value = '';
  }
}
</script>
