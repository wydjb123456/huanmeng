<template>
  <div class="reference-uploader">
    <!-- 缩略图列表 -->
    <div v-if="images.length" class="grid grid-cols-4 gap-2 mb-3">
      <div
        v-for="(img, i) in images"
        :key="i"
        class="relative aspect-square border border-ink-200 overflow-hidden group"
      >
        <img :src="img" :alt="`参考图${i + 1}`" loading="lazy" class="w-full h-full object-cover" />
        <button
          class="absolute top-1 right-1 w-5 h-5 bg-ink-900/70 text-white flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
          @click="removeImage(i)"
          aria-label="删除"
        >×</button>
        <span class="absolute bottom-1 left-1 text-[10px] bg-ink-900/70 text-white px-1">{{ i + 1 }}</span>
      </div>
    </div>

    <!-- 上传区 -->
    <div
      v-if="images.length < maxCount"
      class="border-2 border-dashed border-ink-200 hover:border-ink-400 p-5 text-center cursor-pointer transition-all"
      @click="triggerFileInput"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="onFileChange"
      />
      <svg class="w-6 h-6 mx-auto mb-2 text-ink-400" viewBox="0 0 24 24" fill="none">
        <path d="M12 16V4M12 4l-4 4M12 4l4 4M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="text-xs text-ink-600 mb-1">点击或拖拽上传参考图</p>
      <p class="text-[10px] text-ink-400">JPG / PNG / WEBP，还可上传 {{ maxCount - images.length }} 张</p>
    </div>

    <!-- 上传中遮罩 -->
    <div v-if="uploading" class="flex items-center gap-2 mt-2 text-xs text-primary-600">
      <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
      上传中...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { uploadReferenceImages } from '@/api/upload';

const props = withDefaults(defineProps<{
  modelValue: string[];
  maxCount?: number;
}>(), { maxCount: 4 });

const emit = defineEmits(['update:modelValue']);

const images = ref<string[]>([...props.modelValue]);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement>();

watch(() => props.modelValue, (val) => {
  images.value = [...val];
});

async function handleFiles(files: File[]) {
  const valid = files.filter((f) =>
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)
  );
  if (valid.length === 0) {
    ElMessage.warning('仅支持 JPG / PNG / WEBP 图片');
    return;
  }
  const remaining = props.maxCount - images.value.length;
  if (valid.length > remaining) {
    ElMessage.warning(`最多还能上传 ${remaining} 张`);
  }
  const toUpload = valid.slice(0, remaining);
  if (toUpload.length === 0) return;

  uploading.value = true;
  try {
    const { urls } = await uploadReferenceImages(toUpload);
    images.value.push(...urls);
    emit('update:modelValue', images.value);
    ElMessage.success(`已上传 ${urls.length} 张参考图`);
  } catch {
    // 错误已由拦截器处理
  } finally {
    uploading.value = false;
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1);
  emit('update:modelValue', images.value);
}

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.length) handleFiles(Array.from(target.files));
  target.value = '';
}

function onDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files?.length) handleFiles(Array.from(files));
}
</script>
