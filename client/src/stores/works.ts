import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import request from '@/api/request';
import { useUserStore } from './user';
import { ElMessage } from 'element-plus';

export type WorkType = 'ppt' | 'poster';

export interface ActiveWork {
  workId: number;
  type: WorkType;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  slides: any[];
  error: string;
  startedAt: number;
}

const STORAGE_KEY = 'activeWork';

function loadFromStorage(): ActiveWork | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.status === 'processing' || parsed.status === 'completed') return parsed;
    return null;
  } catch {
    return null;
  }
}

export const useWorksStore = defineStore('works', () => {
  const activeWork = ref<ActiveWork | null>(loadFromStorage());
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const isActive = computed(() => !!activeWork.value && activeWork.value.status === 'processing');
  const isCompleted = computed(() => !!activeWork.value && activeWork.value.status === 'completed');

  function saveToStorage() {
    if (activeWork.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeWork.value));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function setActiveWork(workId: number, type: WorkType) {
    activeWork.value = {
      workId,
      type,
      status: 'processing',
      progress: 0,
      slides: [],
      error: '',
      startedAt: Date.now(),
    };
    saveToStorage();
    startPolling();
  }

  function startPolling() {
    stopPolling();
    if (!activeWork.value) return;

    pollTimer = setInterval(async () => {
      if (!activeWork.value) return;
      try {
        const data: any = await request.get(`/works/${activeWork.value.workId}/status`);
        activeWork.value.slides = data.slides || [];

        if (activeWork.value.type === 'poster') {
          activeWork.value.progress = data.progress || activeWork.value.progress;
        } else {
          const total = activeWork.value.slides.length;
          const completed = activeWork.value.slides.filter((s: any) => s.status === 'completed').length;
          activeWork.value.progress = total > 0 ? Math.floor((completed / total) * 100) : 0;
        }

        if (data.status === 'completed') {
          activeWork.value.status = 'completed';
          activeWork.value.progress = 100;
          stopPolling();
          saveToStorage();
          const userStore = useUserStore();
          userStore.fetchUserInfo();
          ElMessage.success(activeWork.value.type === 'poster' ? '海报生成完成' : 'PPT 生成完成');
        } else if (data.status === 'failed') {
          activeWork.value.status = 'failed';
          activeWork.value.error = data.error || '生成失败';
          stopPolling();
          saveToStorage();
          const userStore = useUserStore();
          userStore.fetchUserInfo();
        } else {
          saveToStorage();
        }
      } catch {
        // 网络错误不立即终止，保留 processing 状态以便下次重试
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function clear() {
    stopPolling();
    activeWork.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  function clearIfCompleted() {
    if (activeWork.value && (activeWork.value.status === 'completed' || activeWork.value.status === 'failed')) {
      clear();
    }
  }

  // 如果从 localStorage 恢复了 processing 状态，自动恢复轮询
  if (activeWork.value && activeWork.value.status === 'processing') {
    startPolling();
  }

  return {
    activeWork,
    isActive,
    isCompleted,
    setActiveWork,
    startPolling,
    stopPolling,
    clear,
    clearIfCompleted,
  };
});
