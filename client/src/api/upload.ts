import request from './request';

/** 上传 PDF 并提取页面（每页转为 PNG 参考图） */
export function uploadPdf(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/works/upload/pdf', formData, {
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<{
    pageCount: number;
    truncated?: boolean;
    originalCount?: number;
    pages: { idx: number; imageUrl: string; title: string }[];
  }>;
}

/** 上传 Word 文档并提取大纲（mammoth → LLM 重构为 slides） */
export function uploadWord(
  file: File,
  opts?: {
    style?: string;
    customStyle?: string;
    language?: string;
    detailLevel?: string;
    pageCount?: number;
    category?: string;
    customCategory?: string;
  },
) {
  const formData = new FormData();
  formData.append('file', file);
  if (opts) {
    Object.entries(opts).forEach(([k, v]) => {
      if (v != null) formData.append(k, String(v));
    });
  }
  return request.post('/works/upload/word', formData, {
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<{
    slideCount: number;
    truncated?: boolean;
    originalCount?: number;
    textTruncated?: boolean;
    slides: { idx: number; title: string; points: string[] }[];
  }>;
}

/** 上传参考图（海报用，1-4 张） */
export function uploadReferenceImages(files: File[]) {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return request.post('/works/upload/reference', formData, {
    timeout: 60000,
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<{ urls: string[] }>;
}
