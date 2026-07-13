<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- 页头 -->
    <div class="mb-8 pb-6 border-b border-ink-200">
      <div class="editorial-number text-primary-500 text-xs tracking-[0.3em] uppercase mb-3">— Admin —</div>
      <h1 class="display-hero text-ink-900 text-5xl mb-2">管理 <span class="script-accent text-7xl text-ink-900">后台</span></h1>
      <p class="text-ink-500">用户、积分、作品与优惠券管理</p>
    </div>

    <el-tabs v-model="activeTab" class="admin-tabs">
      <!-- ============ 统计概览 ============ -->
      <el-tab-pane label="统计概览" name="stats">
        <div v-if="statsLoading" class="py-20 text-center text-ink-400">加载中...</div>
        <div v-else-if="stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-white border border-ink-200/70 p-6">
            <div class="editorial-number text-ink-500 text-xs mb-2">— Users —</div>
            <div class="display-hero text-ink-900 text-4xl">{{ stats.userCount }}</div>
            <div class="text-xs text-ink-400 mt-1">今日新增 {{ stats.todayNewUsers }}</div>
          </div>
          <div class="bg-white border border-ink-200/70 p-6">
            <div class="editorial-number text-ink-500 text-xs mb-2">— Works —</div>
            <div class="display-hero text-ink-900 text-4xl">{{ stats.workCount }}</div>
            <div class="text-xs text-ink-400 mt-1">作品总数</div>
          </div>
          <div class="bg-white border border-ink-200/70 p-6">
            <div class="editorial-number text-ink-500 text-xs mb-2">— Credits —</div>
            <div class="display-hero text-ink-900 text-4xl">{{ stats.completedWorks }}</div>
            <div class="text-xs text-ink-400 mt-1">已完成作品数</div>
          </div>
          <div class="bg-white border border-ink-200/70 p-6">
            <div class="editorial-number text-ink-500 text-xs mb-2">— Active —</div>
            <div class="display-hero text-ink-900 text-4xl">{{ activeRate }}%</div>
            <div class="text-xs text-ink-400 mt-1">完成率</div>
          </div>
        </div>
        <div v-if="stats" class="bg-white border border-ink-200/70 p-6">
          <div class="editorial-number text-ink-500 text-xs mb-4">— Works by Status —</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div v-for="s in stats.worksByStatus" :key="s.status" class="flex items-center justify-between p-3 bg-ink-50">
              <span class="text-sm text-ink-700">{{ statusLabel(s.status) }}</span>
              <span class="display-hero text-ink-900 text-xl">{{ s.count }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ============ 用户管理 ============ -->
      <el-tab-pane label="用户管理" name="users">
        <div class="bg-white border border-ink-200/70 p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <el-input v-model="userQuery" placeholder="搜索用户名" clearable style="width: 240px" @keyup.enter="loadUsers(1)" @clear="loadUsers(1)" />
              <el-button @click="loadUsers(1)">搜索</el-button>
            </div>
            <div class="text-xs text-ink-400">共 {{ usersTotal }} 个用户</div>
          </div>
          <el-table :data="users" v-loading="usersLoading" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column label="角色" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.role === 'ADMIN'" type="danger" size="small">管理员</el-tag>
                <el-tag v-else size="small">用户</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="balance" label="余额" width="100" />
            <el-table-column prop="workCount" label="作品数" width="80" />
            <el-table-column label="注册时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="320">
              <template #default="{ row }">
                <el-button size="small" @click="openAdjustDialog(row)">调整积分</el-button>
                <el-button size="small" @click="openChangePasswordDialog(row)">修改密码</el-button>
                <el-button size="small" @click="viewOperations(row)">操作日志</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="usersTotal > 20"
            class="mt-4 justify-end"
            layout="prev, pager, next"
            :total="usersTotal"
            :page-size="20"
            v-model:current-page="usersPage"
            @current-change="loadUsers()"
          />
        </div>
      </el-tab-pane>

      <!-- ============ 作品历史 ============ -->
      <el-tab-pane label="作品历史" name="works">
        <div class="bg-white border border-ink-200/70 p-6">
          <div class="flex items-center gap-2 mb-4">
            <el-input v-model="worksUserFilter" placeholder="按用户 ID 过滤（可选）" type="number" clearable style="width: 220px" @keyup.enter="loadWorks(1)" @clear="loadWorks(1)" />
            <el-button @click="loadWorks(1)">查询</el-button>
            <el-button @click="worksUserFilter = ''; loadWorks(1)">全部</el-button>
          </div>
          <el-table :data="works" v-loading="worksLoading" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="用户" width="120">
              <template #default="{ row }">{{ row.user?.username }}</template>
            </el-table-column>
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ row.type === 'poster' ? '海报' : 'PPT' }}</template>
            </el-table-column>
            <el-table-column prop="title" label="标题" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="progress" label="进度" width="80" />
            <el-table-column prop="pageCount" label="页数" width="80" />
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="worksTotal > 20"
            class="mt-4 justify-end"
            layout="prev, pager, next"
            :total="worksTotal"
            :page-size="20"
            v-model:current-page="worksPage"
            @current-change="loadWorks()"
          />
        </div>
      </el-tab-pane>

      <!-- ============ 优惠券管理 ============ -->
      <el-tab-pane label="优惠券管理" name="coupons">
        <!-- 统计概览卡片 -->
        <div v-if="couponStats" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white border border-ink-200/70 p-4">
            <div class="editorial-number text-ink-500 text-xs mb-1">— Total —</div>
            <div class="display-hero text-ink-900 text-2xl">{{ couponStats.total }}</div>
            <div class="text-xs text-ink-400">总兑换码数</div>
          </div>
          <div class="bg-white border border-ink-200/70 p-4">
            <div class="editorial-number text-ink-500 text-xs mb-1">— Unused —</div>
            <div class="display-hero text-green-600 text-2xl">{{ couponStats.unused }}</div>
            <div class="text-xs text-ink-400">未使用</div>
          </div>
          <div class="bg-white border border-ink-200/70 p-4">
            <div class="editorial-number text-ink-500 text-xs mb-1">— Used —</div>
            <div class="display-hero text-ink-600 text-2xl">{{ couponStats.used }}</div>
            <div class="text-xs text-ink-400">已使用</div>
          </div>
          <div class="bg-white border border-ink-200/70 p-4">
            <div class="editorial-number text-ink-500 text-xs mb-1">— Value —</div>
            <div class="display-hero text-ink-900 text-2xl">{{ couponStats.totalAmount }}</div>
            <div class="text-xs text-ink-400">总面值（积分）</div>
          </div>
        </div>

        <div class="bg-white border border-ink-200/70 p-6">
          <!-- 一键生成预设套餐 + 自定义 -->
          <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="editorial-number text-ink-500 text-xs mr-2">— Quick Generate —</span>
              <el-button
                v-for="preset in couponPresets"
                :key="preset.label"
                size="small"
                @click="quickGenerate(preset.amount, preset.count)"
              >
                {{ preset.label }}
              </el-button>
              <el-button size="small" type="primary" plain @click="openCouponDialog">自定义</el-button>
            </div>
            <el-button size="small" @click="exportCoupons" :loading="exporting">导出 CSV</el-button>
          </div>

          <!-- 筛选工具栏 -->
          <div class="flex items-center gap-2 mb-4">
            <el-select v-model="couponFilter.status" placeholder="全部状态" clearable size="small" style="width: 140px" @change="loadCoupons()">
              <el-option label="未使用" value="unused" />
              <el-option label="已使用" value="used" />
              <el-option label="已过期" value="expired" />
              <el-option label="已禁用" value="disabled" />
            </el-select>
            <el-input v-model="couponFilter.code" placeholder="搜索兑换码" clearable size="small" style="width: 200px" @keyup.enter="loadCoupons()" @clear="loadCoupons()" />
            <el-button size="small" @click="loadCoupons()">查询</el-button>
          </div>

          <!-- 批量操作工具栏 -->
          <div v-if="selectedCoupons.length > 0" class="flex items-center gap-2 mb-3 p-3 bg-ink-50">
            <span class="text-sm text-ink-600">已选 {{ selectedCoupons.length }} 项</span>
            <el-button size="small" @click="batchAction('disable')">批量禁用</el-button>
            <el-button size="small" @click="batchAction('enable')">批量恢复</el-button>
          </div>

          <el-table :data="coupons" v-loading="couponsLoading" stripe @selection-change="onSelectionChange">
            <el-table-column type="selection" width="40" :selectable="(row: AdminCoupon) => row.status !== 'used'" />
            <el-table-column prop="code" label="兑换码">
              <template #default="{ row }">
                <span class="font-mono text-sm">{{ row.code }}</span>
                <el-button link size="small" class="ml-1" @click="copyCode(row.code)">复制</el-button>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="面值" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="couponStatusType(row.status)" size="small">{{ couponStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="使用者" width="120">
              <template #default="{ row }">{{ row.usedByUsername || '—' }}</template>
            </el-table-column>
            <el-table-column label="使用时间" width="180">
              <template #default="{ row }">{{ row.usedAt ? formatDate(row.usedAt) : '—' }}</template>
            </el-table-column>
            <el-table-column label="过期时间" width="180">
              <template #default="{ row }">{{ row.expiresAt ? formatDate(row.expiresAt) : '永久' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button v-if="row.status === 'unused'" link size="small" @click="toggleCouponStatus(row, 'disable')">禁用</el-button>
                <el-button v-if="row.status === 'disabled'" link size="small" @click="toggleCouponStatus(row, 'enable')">恢复</el-button>
                <el-button v-if="row.status !== 'used'" link size="small" type="danger" @click="removeCoupon(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 调整积分对话框 -->
    <el-dialog v-model="adjustDialogVisible" title="调整积分" width="440px">
      <div v-if="adjustTarget" class="space-y-4">
        <div class="text-sm text-ink-600">
          用户：<span class="text-ink-900 font-medium">{{ adjustTarget.username }}</span>（当前余额 {{ adjustTarget.balance }}）
        </div>
        <el-input v-model.number="adjustForm.delta" type="number" placeholder="正数充值，负数扣减" />
        <el-input v-model="adjustForm.reason" placeholder="操作原因（可选）" />
      </div>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjusting" @click="submitAdjust">确认</el-button>
      </template>
    </el-dialog>

    <!-- 操作日志对话框 -->
    <el-dialog v-model="operationsDialogVisible" title="操作日志" width="640px">
      <el-table :data="operations" v-loading="operationsLoading" stripe size="small">
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">{{ row.action === 'balance_adjust' ? '调整积分' : '生成优惠券' }}</template>
        </el-table-column>
        <el-table-column label="变动" width="80">
          <template #default="{ row }">{{ row.delta ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="管理员" width="100">
          <template #default="{ row }">{{ row.adminUsername }}</template>
        </el-table-column>
        <el-table-column label="原因" prop="reason" show-overflow-tooltip />
      </el-table>
    </el-dialog>

    <!-- 生成优惠券对话框 -->
    <el-dialog v-model="couponDialogVisible" title="生成优惠券" width="440px">
      <div class="space-y-4">
        <el-input v-model.number="couponForm.amount" type="number" placeholder="面值（积分数量）" />
        <el-input v-model.number="couponForm.count" type="number" placeholder="生成数量" />
        <el-date-picker v-model="couponForm.expiresAt" type="datetime" placeholder="过期时间（可选，留空为永久）" style="width: 100%" />
      </div>
      <template #footer>
        <el-button @click="couponDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="couponGenerating" @click="submitGenerateCoupon">生成</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="changePasswordDialogVisible" title="修改密码" width="440px">
      <div v-if="changePasswordTarget" class="space-y-4">
        <div class="text-sm text-ink-600">
          修改用户：<span class="text-ink-900 font-medium">{{ changePasswordTarget.username }}</span> 的密码
        </div>
        <el-input v-model="changePasswordForm.newPassword" type="password" placeholder="新密码（至少6位）" show-password />
        <el-input v-model="changePasswordForm.confirmPassword" type="password" placeholder="确认新密码" show-password />
      </div>
      <template #footer>
        <el-button @click="changePasswordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="changingPassword" @click="submitChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type AdminStats, type AdminUser, type AdminWork, type AdminCoupon, type AdminOperation, type CouponStats } from '@/api/admin';

const activeTab = ref('stats');

// 统计
const stats = ref<AdminStats | null>(null);
const statsLoading = ref(false);
const activeRate = computed(() => {
  if (!stats.value || stats.value.workCount === 0) return 0;
  const completed = stats.value.worksByStatus.find((w) => w.status === 'completed')?.count ?? 0;
  return Math.round((completed / stats.value.workCount) * 100);
});

// 用户
const users = ref<AdminUser[]>([]);
const usersTotal = ref(0);
const usersPage = ref(1);
const usersLoading = ref(false);
const userQuery = ref('');

// 作品
const works = ref<AdminWork[]>([]);
const worksTotal = ref(0);
const worksPage = ref(1);
const worksLoading = ref(false);
const worksUserFilter = ref('');

// 优惠券
const coupons = ref<AdminCoupon[]>([]);
const couponsLoading = ref(false);
const couponStats = ref<CouponStats | null>(null);
const couponFilter = ref({ status: '', code: '' });
const selectedCoupons = ref<AdminCoupon[]>([]);
const exporting = ref(false);

const couponPresets = [
  { label: '10 积分 × 10 张', amount: 10, count: 10 },
  { label: '50 积分 × 5 张', amount: 50, count: 5 },
  { label: '100 积分 × 3 张', amount: 100, count: 3 },
];

// 调整积分对话框
const adjustDialogVisible = ref(false);
const adjustTarget = ref<AdminUser | null>(null);
const adjustForm = ref({ delta: 0, reason: '' });
const adjusting = ref(false);

// 操作日志对话框
const operationsDialogVisible = ref(false);
const operations = ref<AdminOperation[]>([]);
const operationsLoading = ref(false);

// 生成优惠券对话框
const couponDialogVisible = ref(false);
const couponForm = ref({ amount: 0, count: 1, expiresAt: '' });
const couponGenerating = ref(false);

// 修改密码对话框
const changePasswordDialogVisible = ref(false);
const changePasswordTarget = ref<AdminUser | null>(null);
const changePasswordForm = ref({ newPassword: '', confirmPassword: '' });
const changingPassword = ref(false);

onMounted(() => {
  loadStats();
  loadUsers();
  loadWorks();
  loadCoupons();
  loadCouponStats();
});

async function loadStats() {
  statsLoading.value = true;
  try {
    stats.value = await adminApi.stats();
  } finally {
    statsLoading.value = false;
  }
}

async function loadUsers(page?: number) {
  if (page) usersPage.value = page;
  usersLoading.value = true;
  try {
    const res = await adminApi.listUsers(userQuery.value || undefined, usersPage.value, 20);
    users.value = res.items;
    usersTotal.value = res.total;
  } finally {
    usersLoading.value = false;
  }
}

async function loadWorks(page?: number) {
  if (page) worksPage.value = page;
  worksLoading.value = true;
  try {
    const res = await adminApi.listWorks(worksPage.value, 20, worksUserFilter.value ? Number(worksUserFilter.value) : undefined);
    works.value = res.items;
    worksTotal.value = res.total;
  } finally {
    worksLoading.value = false;
  }
}

async function loadCoupons() {
  couponsLoading.value = true;
  try {
    coupons.value = await adminApi.listCoupons(
      couponFilter.value.status || undefined,
      couponFilter.value.code || undefined,
    );
  } finally {
    couponsLoading.value = false;
  }
}

async function loadCouponStats() {
  try {
    couponStats.value = await adminApi.couponStats();
  } catch {
    // ignore
  }
}

async function quickGenerate(amount: number, count: number) {
  try {
    await ElMessageBox.confirm(`确定生成 ${count} 张面值 ${amount} 积分的兑换码？`, '一键生成', { type: 'info' });
  } catch {
    return;
  }
  try {
    const res = await adminApi.generateCoupons(amount, count);
    ElMessage.success(`已生成 ${res.count} 张兑换码`);
    loadCoupons();
    loadCouponStats();
  } catch {
    // error handled by interceptor
  }
}

function onSelectionChange(rows: AdminCoupon[]) {
  selectedCoupons.value = rows;
}

async function batchAction(action: 'disable' | 'enable') {
  const ids = selectedCoupons.value.map((c) => c.id);
  try {
    const res = await adminApi.batchUpdateCoupons(ids, action);
    ElMessage.success(`${action === 'disable' ? '禁用' : '恢复'} ${res.updated} 张`);
    loadCoupons();
    loadCouponStats();
  } catch {
    // error handled by interceptor
  }
}

async function toggleCouponStatus(row: AdminCoupon, action: 'disable' | 'enable') {
  try {
    await adminApi.batchUpdateCoupons([row.id], action);
    ElMessage.success(action === 'disable' ? '已禁用' : '已恢复');
    loadCoupons();
    loadCouponStats();
  } catch {
    // error handled by interceptor
  }
}

async function removeCoupon(row: AdminCoupon) {
  try {
    await ElMessageBox.confirm(`确定删除兑换码 ${row.code}？`, '删除', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await adminApi.deleteCoupon(row.id);
    ElMessage.success('已删除');
    loadCoupons();
    loadCouponStats();
  } catch {
    // error handled by interceptor
  }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.warning('复制失败，请手动复制');
  }
}

async function exportCoupons() {
  exporting.value = true;
  try {
    const blob = await adminApi.exportCoupons();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coupons.csv';
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('已导出');
  } catch {
    // error handled by interceptor
  } finally {
    exporting.value = false;
  }
}

function openAdjustDialog(user: AdminUser) {
  adjustTarget.value = user;
  adjustForm.value = { delta: 0, reason: '' };
  adjustDialogVisible.value = true;
}

async function submitAdjust() {
  if (!adjustTarget.value) return;
  if (!adjustForm.value.delta || adjustForm.value.delta === 0) {
    ElMessage.warning('请输入非零变动');
    return;
  }
  adjusting.value = true;
  try {
    await adminApi.adjustBalance(adjustTarget.value.id, adjustForm.value.delta, adjustForm.value.reason || undefined);
    ElMessage.success(`调整成功，新余额：${adjustTarget.value.balance + adjustForm.value.delta}`);
    adjustDialogVisible.value = false;
    loadUsers();
  } finally {
    adjusting.value = false;
  }
}

async function viewOperations(user: AdminUser) {
  operationsDialogVisible.value = true;
  operationsLoading.value = true;
  try {
    operations.value = await adminApi.userOperations(user.id);
  } finally {
    operationsLoading.value = false;
  }
}

function openCouponDialog() {
  couponForm.value = { amount: 0, count: 1, expiresAt: '' };
  couponDialogVisible.value = true;
}

async function submitGenerateCoupon() {
  if (!couponForm.value.amount || couponForm.value.amount <= 0) {
    ElMessage.warning('请输入有效面值');
    return;
  }
  if (!couponForm.value.count || couponForm.value.count <= 0) {
    ElMessage.warning('请输入有效数量');
    return;
  }
  couponGenerating.value = true;
  try {
    const res = await adminApi.generateCoupons(
      couponForm.value.amount,
      couponForm.value.count,
      couponForm.value.expiresAt ? new Date(couponForm.value.expiresAt).toISOString() : undefined,
    );
    ElMessage.success(`生成 ${res.count} 张优惠券`);
    couponDialogVisible.value = false;
    loadCoupons();
    loadCouponStats();
  } finally {
    couponGenerating.value = false;
  }
}

function openChangePasswordDialog(user: AdminUser) {
  changePasswordTarget.value = user;
  changePasswordForm.value = { newPassword: '', confirmPassword: '' };
  changePasswordDialogVisible.value = true;
}

async function submitChangePassword() {
  if (!changePasswordTarget.value) return;
  if (!changePasswordForm.value.newPassword || changePasswordForm.value.newPassword.length < 6) {
    ElMessage.warning('新密码至少需要6位');
    return;
  }
  if (changePasswordForm.value.newPassword !== changePasswordForm.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致');
    return;
  }
  changingPassword.value = true;
  try {
    await adminApi.changePassword(changePasswordTarget.value.id, changePasswordForm.value.newPassword);
    ElMessage.success('密码修改成功');
    changePasswordDialogVisible.value = false;
  } finally {
    changingPassword.value = false;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: '排队中', processing: '生成中', completed: '已完成', failed: '失败', draft: '草稿',
  };
  return map[s] ?? s;
}

function statusType(s: string): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'completed') return 'success';
  if (s === 'processing' || s === 'pending') return 'warning';
  if (s === 'failed') return 'danger';
  return 'info';
}

function couponStatusLabel(s: string) {
  const map: Record<string, string> = { unused: '未使用', used: '已使用', expired: '已过期', disabled: '已禁用' };
  return map[s] ?? s;
}

function couponStatusType(s: string): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'unused') return 'success';
  if (s === 'used') return 'info';
  if (s === 'expired') return 'warning';
  return 'danger';
}
</script>

<style scoped>
:deep(.admin-tabs .el-tabs__item.is-active) {
  color: #1a1a1a;
}
:deep(.admin-tabs .el-tabs__active-bar) {
  background-color: #1a1a1a;
}
:deep(.el-pagination) {
  display: flex;
  justify-content: flex-end;
}
</style>
