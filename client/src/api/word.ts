import request from './request';

export interface WordSection {
  idx: number;
  title: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string | null;
}

export interface WordWork {
  workId: number;
  title: string;
  prompt: string;
  style: string;
  status: string;
  progress: number;
  documentUrl: string | null;
  sections: WordSection[];
}

export interface WordOutlineSection {
  title: string;
  summary: string;
}

/** 生成 Word 章节大纲（免费） */
export function generateWordOutline(data: {
  prompt: string;
  style: string;
  customStyle?: string;
  category?: string;
  customCategory?: string;
  language?: string;
  detailLevel?: string;
  sectionCount?: number;
}) {
  return request.post('/works/word/outline', data, { timeout: 60000 }) as Promise<{ sections: WordOutlineSection[] }>;
}

/** 创建 Word 作品 + sections */
export function createWordWork(data: {
  prompt: string;
  style: string;
  customStyle?: string;
  category?: string;
  customCategory?: string;
  language?: string;
  detailLevel?: string;
  sections: { title: string; summary: string }[];
}) {
  return request.post('/works/word/create', data) as Promise<{ workId: number; sections: any[] }>;
}

/** 获取 Word 作品详情 */
export function getWordWork(workId: number) {
  return request.get(`/works/word/${workId}`) as Promise<WordWork>;
}

/** 生成单章节正文 */
export function generateWordSection(workId: number, sectionIdx: number) {
  return request.post(`/works/word/${workId}/sections/${sectionIdx}/generate`, {}, { timeout: 120000 }) as Promise<{
    sectionIdx: number;
    content: string;
    status: string;
    progress: number;
  }>;
}

/** 重生成单章节 */
export function regenerateWordSection(workId: number, sectionIdx: number) {
  return request.post(`/works/word/${workId}/sections/${sectionIdx}/regenerate`, {}, { timeout: 120000 }) as Promise<{
    sectionIdx: number;
    content: string;
    status: string;
    progress: number;
  }>;
}

/** 下载 .docx（fetch + blob 方式，带 JWT） */
export async function downloadWordDocx(workId: number) {
  const { useUserStore } = await import('@/stores/user');
  const token = useUserStore().token;
  const res = await fetch(`/api/works/word/${workId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '下载失败' }));
    throw new Error(err.message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `document-${workId}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 图片反推风格 */
export function reverseStyle(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/works/prompt/reverse', formData, {
    timeout: 60000,
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<{ style: string; imageUrl: string }>;
}
