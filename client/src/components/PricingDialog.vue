<template>
  <el-dialog
    v-model="visible"
    :fullscreen="maximized"
    :width="maximized ? undefined : '900px'"
    :show-close="false"
    :class="['pricing-dialog', { 'is-maximized': maximized }]"
    append-to-body
    destroy-on-close
  >
    <template #header>
      <div class="flex items-center justify-between pr-2">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-primary-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <h2 class="cal-cn text-xl text-ink-900">收费标准</h2>
          <span class="editorial-number text-ink-400 text-xs hidden sm:inline">— Pricing —</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="p-1.5 text-ink-400 hover:text-ink-900 hover:bg-ink-100 rounded transition-colors"
            @click="maximized = !maximized"
            :title="maximized ? '还原' : '最大化'"
          >
            <svg v-if="!maximized" class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button
            class="p-1.5 text-ink-400 hover:text-ink-900 hover:bg-ink-100 rounded transition-colors"
            title="关闭"
            @click="visible = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </template>

    <div class="pricing-content">
      <!-- 二合一：余额 + 兑换码 -->
      <section class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          <!-- 当前余额卡片 -->
          <div class="md:col-span-2 rounded-lg p-4 bg-gradient-to-br from-ink-900 to-ink-800 text-white flex flex-col justify-between">
            <div>
              <div class="editorial-number text-white/50 text-xs mb-1">— Balance —</div>
              <div class="text-xs text-white/60">我的积分</div>
            </div>
            <div class="mt-3">
              <span class="text-4xl font-bold tracking-tight">{{ balance }}</span>
              <span class="text-sm text-white/60 ml-1">积分</span>
            </div>
            <div v-if="!isLoggedIn" class="mt-3">
              <router-link to="/login" class="text-xs text-primary-300 hover:text-primary-200 border-b border-primary-300/50 pb-0.5">
                登录后查看 →
              </router-link>
            </div>
          </div>

          <!-- 兑换码输入 -->
          <div class="md:col-span-3 rounded-lg p-4 border-2 border-dashed border-primary-300 bg-primary-50/30">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-4 h-4 text-primary-600" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="text-sm font-semibold text-ink-900">兑换积分</span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="redeemCode"
                type="text"
                placeholder="输入兑换码，如 PPT-XXXXXXXX"
                class="flex-1 px-3 py-2 text-sm font-mono border border-ink-200 rounded bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                @keyup.enter="submitRedeem"
              />
              <button
                class="px-4 py-2 text-sm font-medium text-white bg-ink-900 hover:bg-ink-800 rounded transition-colors disabled:opacity-50"
                :disabled="redeeming || !redeemCode.trim()"
                @click="submitRedeem"
              >
                {{ redeeming ? '兑换中…' : '立即兑换' }}
              </button>
            </div>
            <div class="mt-3 flex items-center gap-3">
              <div class="flex items-center gap-2">
                <img :src="contactQrUrl" alt="开发者二维码" class="w-12 h-12 object-cover rounded border border-ink-200" @error="onQrError" v-if="qrVisible" />
                <div class="text-xs text-ink-600 leading-snug">
                  <div>没有兑换码？</div>
                  <div>扫码或微信 <span class="font-mono font-semibold text-ink-900 select-all">FDHRwu</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 积分说明 -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="editorial-number text-primary-500 text-xs">01</span>
          <h3 class="font-serif-cn text-lg text-ink-900">积分体系</h3>
        </div>
        <div class="bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm text-ink-700 leading-relaxed">
          本平台采用 <strong class="text-ink-900">积分制</strong> 按量计费，无需订阅。<br />
          新用户注册赠送 <strong class="text-primary-700">50 积分</strong>，可生成约 1 次极速 PPT 或 1 张精细海报。<br />
          积分用尽后，可通过兑换码充值（扫码联系开发者购买）。
        </div>
      </section>

      <!-- 海报收费标准 -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="editorial-number text-primary-500 text-xs">02</span>
          <h3 class="font-serif-cn text-lg text-ink-900">海报生成</h3>
          <span class="text-xs text-ink-400">单次计费 · 按分辨率×渲染质量</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border border-ink-200">
            <thead>
              <tr class="bg-ink-100">
                <th class="text-left py-2.5 px-3 font-medium text-ink-700">分辨率 \ 质量</th>
                <th class="text-center py-2.5 px-3 font-medium text-ink-700">Low（低）</th>
                <th class="text-center py-2.5 px-3 font-medium text-ink-700">Medium（中）</th>
                <th class="text-center py-2.5 px-3 font-medium text-ink-700">High（高）</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in posterTable" :key="row.res" class="border-t border-ink-200 hover:bg-ink-50">
                <td class="py-2.5 px-3 font-medium text-ink-900">{{ row.res }}</td>
                <td
                  v-for="q in ['low', 'medium', 'high'] as const"
                  :key="q"
                  class="text-center py-2.5 px-3"
                  :class="row.isDefault(q) ? 'bg-primary-100 text-primary-800 font-semibold' : 'text-ink-700'"
                >
                  {{ row[q] }} 积分
                  <span v-if="row.isDefault(q)" class="block text-[10px] text-primary-500 mt-0.5">默认</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-xs text-ink-400 space-y-0.5">
          <p>· 适用范围：海报页、单图生成、参考图风格推断</p>
          <p>· 计费单位：每次生成扣除对应积分，失败不扣费</p>
          <p>· 1K 适合草图预览，2K 适合屏幕展示，4K 适合打印输出</p>
        </div>
      </section>

      <!-- PPT 收费标准 -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="editorial-number text-primary-500 text-xs">03</span>
          <h3 class="font-serif-cn text-lg text-ink-900">PPT 生成</h3>
          <span class="text-xs text-ink-400">按生成模式计费</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 极速模式 -->
          <div class="border border-ink-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-4 h-4 text-primary-600" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <h4 class="font-serif-cn text-base text-ink-900">极速模式</h4>
            </div>
            <p class="text-xs text-ink-500 mb-3">生成 1 张长图后自动切分为多页，速度快</p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border border-ink-200">
                <thead>
                  <tr class="bg-ink-100">
                    <th class="text-left py-2 px-2 font-medium text-ink-700">分辨率</th>
                    <th class="text-center py-2 px-2 font-medium text-ink-700">Low</th>
                    <th class="text-center py-2 px-2 font-medium text-ink-700">Med</th>
                    <th class="text-center py-2 px-2 font-medium text-ink-700">High</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in pptFastTable" :key="row.res" class="border-t border-ink-200">
                    <td class="py-2 px-2 font-medium text-ink-900">{{ row.res }}</td>
                    <td class="text-center py-2 px-2 text-ink-700">{{ row.low }}</td>
                    <td class="text-center py-2 px-2 text-ink-700">{{ row.medium }}</td>
                    <td class="text-center py-2 px-2 text-ink-700">{{ row.high }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-xs text-ink-400">公式：海报积分 + 20 切图费</p>
          </div>

          <!-- 精细模式 -->
          <div class="border border-primary-300 rounded-lg p-4 bg-primary-50/30">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-4 h-4 text-primary-600" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.4L12 16.8 5.7 21.2 8 13.8 2 9.4h7.6L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <h4 class="font-serif-cn text-base text-ink-900">精细模式</h4>
              <span class="text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded">推荐</span>
            </div>
            <p class="text-xs text-ink-500 mb-3">逐页生成独立配图，质量更高</p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border border-ink-200">
                <thead>
                  <tr class="bg-ink-100">
                    <th class="text-left py-2 px-2 font-medium text-ink-700">分辨率</th>
                    <th class="text-center py-2 px-2 font-medium text-ink-700">Low</th>
                    <th class="text-center py-2 px-2 font-medium text-ink-700">Med</th>
                    <th class="text-center py-2 px-2 font-medium text-ink-700">High</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in pptFineTable" :key="row.res" class="border-t border-ink-200">
                    <td class="py-2 px-2 font-medium text-ink-900">{{ row.res }}</td>
                    <td class="text-center py-2 px-2 text-ink-700">{{ row.low }}/页</td>
                    <td class="text-center py-2 px-2 text-ink-700">{{ row.medium }}/页</td>
                    <td class="text-center py-2 px-2 text-ink-700">{{ row.high }}/页</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-xs text-ink-400">示例：9 页 2K+High = 30×9 = 270 积分</p>
          </div>
        </div>
      </section>

      <!-- 积分套餐 -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="editorial-number text-primary-500 text-xs">04</span>
          <h3 class="font-serif-cn text-lg text-ink-900">积分套餐</h3>
          <span class="text-xs text-ink-400">通过兑换码购买</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div
            v-for="pkg in packages"
            :key="pkg.name"
            class="border rounded-lg p-3 flex flex-col"
            :class="pkg.featured ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-300' : 'border-ink-200'"
          >
            <div v-if="pkg.featured" class="text-[10px] text-primary-600 font-semibold mb-1">热门</div>
            <div class="font-serif-cn text-sm text-ink-900 mb-1">{{ pkg.name }}</div>
            <div class="text-2xl font-bold text-ink-900 mb-0.5">{{ pkg.points }}</div>
            <div class="text-xs text-ink-400 mb-2">积分</div>
            <div class="text-xs text-ink-500 line-through" v-if="pkg.original">原价 ¥{{ pkg.original }}</div>
            <div class="text-sm font-semibold text-primary-700 mt-auto">¥{{ pkg.price }}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">{{ pkg.note }}</div>
          </div>
        </div>
      </section>

      <!-- 常见问题 -->
      <section class="mb-2">
        <div class="flex items-center gap-2 mb-3">
          <span class="editorial-number text-primary-500 text-xs">05</span>
          <h3 class="font-serif-cn text-lg text-ink-900">常见问题</h3>
        </div>
        <div class="space-y-2 text-sm text-ink-600">
          <div class="flex gap-2">
            <span class="text-primary-500 font-bold flex-shrink-0">Q:</span>
            <span>生成失败会扣费吗？<strong class="text-ink-900">不会</strong>，失败自动退还积分。</span>
          </div>
          <div class="flex gap-2">
            <span class="text-primary-500 font-bold flex-shrink-0">Q:</span>
            <span>积分有有效期吗？<strong class="text-ink-900">注册赠送 90 天有效，付费购买永久有效</strong>。</span>
          </div>
          <div class="flex gap-2">
            <span class="text-primary-500 font-bold flex-shrink-0">Q:</span>
            <span>如何购买积分？<strong class="text-ink-900">通过兑换码</strong>，扫码联系开发者获取。</span>
          </div>
          <div class="flex gap-2">
            <span class="text-primary-500 font-bold flex-shrink-0">Q:</span>
            <span>不同质量有什么区别？<strong class="text-ink-900">Low 快速预览，Medium 日常使用，High 高清输出</strong>。</span>
          </div>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { couponsApi } from '@/api/coupons';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const visible = ref(props.modelValue);
const maximized = ref(false);

watch(() => props.modelValue, async (v) => {
  visible.value = v;
  if (v && userStore.isLoggedIn) {
    await userStore.fetchUserInfo();
  }
});
watch(visible, (v) => emit('update:modelValue', v));

// 余额 & 兑换
const userStore = useUserStore();
const redeemCode = ref('');
const redeeming = ref(false);
const contactQrUrl = '/contact-qr.jpg?v=2';
const qrVisible = ref(true);

const isLoggedIn = computed(() => userStore.isLoggedIn);
const balance = computed(() => userStore.userInfo?.balance ?? 0);

function onQrError() {
  qrVisible.value = false;
}

async function submitRedeem() {
  if (!redeemCode.value.trim()) {
    ElMessage.warning('请输入兑换码');
    return;
  }
  redeeming.value = true;
  try {
    const res = await couponsApi.redeem(redeemCode.value);
    ElMessage.success(`兑换成功！获得 ${res.amount} 积分，当前余额 ${res.newBalance}`);
    redeemCode.value = '';
    await userStore.fetchUserInfo();
  } catch {
    // handled by interceptor
  } finally {
    redeeming.value = false;
  }
}

interface CostRow {
  res: string;
  low: number;
  medium: number;
  high: number;
  isDefault: (q: 'low' | 'medium' | 'high') => boolean;
}

const posterTable: CostRow[] = [
  { res: '1K', low: 4, medium: 8, high: 18, isDefault: () => false },
  { res: '2K', low: 6, medium: 14, high: 30, isDefault: (q) => q === 'high' },
  { res: '4K', low: 10, medium: 22, high: 45, isDefault: () => false },
];

const pptFastTable: CostRow[] = [
  { res: '1K', low: 24, medium: 28, high: 38, isDefault: () => false },
  { res: '2K', low: 26, medium: 34, high: 50, isDefault: () => false },
  { res: '4K', low: 30, medium: 42, high: 65, isDefault: () => false },
];

const pptFineTable: CostRow[] = [
  { res: '1K', low: 4, medium: 8, high: 18, isDefault: () => false },
  { res: '2K', low: 6, medium: 14, high: 30, isDefault: () => false },
  { res: '4K', low: 10, medium: 22, high: 45, isDefault: () => false },
];

interface Package {
  name: string;
  points: number;
  price: number;
  original?: number;
  note: string;
  featured?: boolean;
}

const packages: Package[] = [
  { name: '体验包', points: 50, price: 5, note: '新用户试水' },
  { name: '基础包', points: 200, price: 18, original: 20, note: '+20 赠送', featured: true },
  { name: '标准包', points: 500, price: 40, original: 50, note: '+100 赠送' },
  { name: '专业包', points: 1500, price: 100, original: 150, note: '+500 赠送' },
  { name: '旗舰包', points: 5000, price: 300, original: 500, note: '+2000 赠送' },
  { name: '活动包', points: 20, price: 2, note: '限时活动' },
];
</script>

<style scoped>
.pricing-content {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 0 4px;
}

.is-maximized .pricing-content {
  max-height: calc(100vh - 80px);
  padding: 16px 24px;
}

.pricing-content table {
  border-collapse: collapse;
  min-width: 400px;
}

@media (max-width: 640px) {
  .pricing-content {
    max-height: calc(100vh - 160px);
  }
}
</style>
