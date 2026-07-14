<template>
  <el-dialog v-model="visible" :title="announcement?.title || '公告'" width="500px" center>
    <div class="whitespace-pre-wrap text-ink-700 leading-relaxed min-h-[100px]">
      {{ announcement?.content }}
    </div>
    <template #footer>
      <div class="flex justify-center mt-4">
        <el-button type="primary" @click="closeModal" class="w-32">我知道了</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminApi } from '@/api/admin';

const visible = ref(false);
const announcement = ref<any>(null);

onMounted(async () => {
  try {
    const res = await adminApi.getActiveAnnouncement();
    if (res && res.id) {
      const viewed = localStorage.getItem(`announcement_viewed_${res.id}`);
      if (!viewed) {
        announcement.value = res;
        visible.value = true;
      }
    }
  } catch (e) {
    // Ignore if not logged in or API fails
  }
});

function closeModal() {
  if (announcement.value) {
    localStorage.setItem(`announcement_viewed_${announcement.value.id}`, 'true');
  }
  visible.value = false;
}
</script>
