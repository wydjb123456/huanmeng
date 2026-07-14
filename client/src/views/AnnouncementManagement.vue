<template>
  <div class="bg-white border border-ink-200/70 p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="editorial-number text-ink-500 text-xs">— Announcements —</div>
      <el-button type="primary" size="small" @click="openCreateDialog">发布新公告</el-button>
    </div>

    <el-table :data="announcements" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="content" label="内容" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch v-model="row.isActive" @change="toggleActive(row)" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button link size="small" type="danger" @click="removeAnnouncement(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑公告' : '发布新公告'" width="500px">
      <div class="space-y-4">
        <el-input v-model="form.title" placeholder="公告标题" />
        <el-input v-model="form.content" type="textarea" :rows="4" placeholder="公告内容" />
        <div class="flex items-center gap-2">
          <span class="text-sm text-ink-600">是否立即启用：</span>
          <el-switch v-model="form.isActive" />
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '@/api/admin';

const announcements = ref<any[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const form = ref({ id: 0, title: '', content: '', isActive: true });

onMounted(() => {
  loadAnnouncements();
});

async function loadAnnouncements() {
  loading.value = true;
  try {
    announcements.value = await adminApi.getAnnouncements();
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEdit.value = false;
  form.value = { id: 0, title: '', content: '', isActive: true };
  dialogVisible.value = true;
}

function openEditDialog(row: any) {
  isEdit.value = true;
  form.value = { id: row.id, title: row.title, content: row.content, isActive: row.isActive };
  dialogVisible.value = true;
}

async function submit() {
  if (!form.value.title || !form.value.content) {
    ElMessage.warning('标题和内容不能为空');
    return;
  }
  submitting.value = true;
  try {
    if (isEdit.value) {
      await adminApi.updateAnnouncement(form.value.id, {
        title: form.value.title,
        content: form.value.content,
        isActive: form.value.isActive,
      });
      ElMessage.success('更新成功');
    } else {
      await adminApi.createAnnouncement({
        title: form.value.title,
        content: form.value.content,
        isActive: form.value.isActive,
      });
      ElMessage.success('发布成功');
    }
    dialogVisible.value = false;
    loadAnnouncements();
  } finally {
    submitting.value = false;
  }
}

async function toggleActive(row: any) {
  try {
    await adminApi.updateAnnouncement(row.id, { isActive: row.isActive });
    ElMessage.success('状态已更新');
  } catch {
    row.isActive = !row.isActive; // revert
  }
}

async function removeAnnouncement(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该公告？', '删除', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await adminApi.deleteAnnouncement(row.id);
    ElMessage.success('已删除');
    loadAnnouncements();
  } catch {}
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>
