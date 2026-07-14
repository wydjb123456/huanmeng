<template>
  <el-dialog
    v-model="visible"
    title="每日签到 & 邀请奖励"
    width="480px"
    class="custom-dialog"
    destroy-on-close
    align-center
    @open="fetchStatus"
  >
    <div class="space-y-8 py-2">
      <!-- 积分概览 -->
      <div class="flex items-center justify-between bg-ink-50 p-6 rounded-sm border border-ink-100">
        <div>
          <div class="text-sm text-ink-500 mb-1">当前积分</div>
          <div class="text-4xl font-serif-cn text-ink-900">{{ balance }}</div>
        </div>
        <div class="text-right">
          <button
            class="px-6 py-2.5 bg-ink-900 text-white text-sm tracking-widest uppercase hover:bg-ink-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="todayCheckedIn || loading"
            @click="handleCheckIn"
          >
            {{ todayCheckedIn ? '今日已签到' : '立即签到' }}
          </button>
          <div class="text-xs text-ink-400 mt-2">每日签到 +10 积分</div>
        </div>
      </div>

      <div class="h-px bg-ink-100"></div>

      <!-- 邀请好友 -->
      <div>
        <h3 class="text-lg font-serif-cn text-ink-900 mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v16m8-8H4"/></svg>
          邀请好友
        </h3>
        <p class="text-sm text-ink-500 mb-6">邀请好友注册，好友可获得 20 额外积分，您将获得 50 积分奖励。</p>
        
        <div class="bg-ink-50 p-4 rounded-sm border border-ink-100 flex items-center gap-4">
          <div class="flex-1">
            <div class="text-xs text-ink-400 mb-1">您的专属邀请码</div>
            <div class="text-lg font-mono tracking-widest text-ink-900">{{ inviteCode || '加载中...' }}</div>
          </div>
          <button
            class="px-4 py-2 border border-ink-200 text-ink-700 text-sm hover:border-ink-900 hover:text-ink-900 transition-colors"
            @click="copyCode"
          >
            复制
          </button>
        </div>

        <div class="mt-4 flex items-center justify-between text-sm">
          <span class="text-ink-500">已成功邀请</span>
          <span class="font-medium text-ink-900">{{ inviteCount }} 人</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import request from '@/api/request';
import { ElMessage } from 'element-plus';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const userStore = useUserStore();

const loading = ref(false);
const balance = ref(0);
const todayCheckedIn = ref(false);
const inviteCode = ref('');
const inviteCount = ref(0);

async function fetchStatus() {
  try {
    const res: any = await request.get('/rewards/status');
    balance.value = res.balance;
    todayCheckedIn.value = res.todayCheckedIn;
    inviteCode.value = res.inviteCode;
    inviteCount.value = res.inviteCount;
    // 同步更新本地 user store 余额
    if (userStore.userInfo) {
      userStore.userInfo.balance = res.balance;
    }
  } catch (error) {
    console.error('Failed to fetch rewards status', error);
  }
}

async function handleCheckIn() {
  loading.value = true;
  try {
    const res: any = await request.post('/rewards/check-in');
    ElMessage.success(`签到成功！获得 ${res.points} 积分`);
    todayCheckedIn.value = true;
    balance.value += res.points;
    if (userStore.userInfo) {
      userStore.userInfo.balance = balance.value;
    }
  } catch (error: any) {
    // 拦截器会处理错误提示
  } finally {
    loading.value = false;
  }
}

async function copyCode() {
  if (!inviteCode.value) return;
  try {
    await navigator.clipboard.writeText(inviteCode.value);
    ElMessage.success('邀请码已复制');
  } catch {
    ElMessage.warning('复制失败，请手动复制');
  }
}
</script>

<style scoped>
/* 继承项目极简风格的样式可以在全局调整，这里保留基本结构 */
</style>
