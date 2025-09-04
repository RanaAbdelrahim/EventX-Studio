// utils/downloadHelper.ts
import api from './api';

export interface DownloadFileOptions {
  url: string;
  filename?: string;
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

/* ---------- helpers ---------- */

function parseContentDispositionFilename(cd?: string | null): string | null {
  if (!cd) return null;

  // RFC 5987 filename*=
  const starMatch = cd.match(/filename\*\s*=\s*(?:UTF-8''|)([^;]+)/i);
  if (starMatch?.[1]) {
    try {
      // Remove surrounding quotes if present, then decode
      const raw = starMatch[1].trim().replace(/^"(.*)"$/, '$1');
      return decodeURIComponent(raw);
    } catch {
      // fallthrough
    }
  }

  // filename=
  const simpleMatch = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (simpleMatch?.[2]) {
    return simpleMatch[2].trim();
  }

  return null;
}

function extFromContentType(ct?: string | null): string {
  if (!ct) return '';
  const mime = ct.toLowerCase();

  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'text/csv': '.csv',
    'application/json': '.json',
    'text/plain': '.txt',
    'application/zip': '.zip',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
  };

  // exact match first
  if (map[mime]) return map[mime];

  // broader contains checks for safety
  if (mime.includes('spreadsheetml')) return '.xlsx';
  if (mime.includes('excel')) return '.xls';
  if (mime.includes('csv')) return '.csv';
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('json')) return '.json';
  if (mime.includes('zip')) return '.zip';
  if (mime.includes('image/')) return ''; // let browser infer if unknown image subtype

  return '';
}

function isoDatePrefix(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/* ---------- main ---------- */

export const downloadFile = async ({
  url,
  filename,
  onStart,
  onFinish,
  onError,
}: DownloadFileOptions): Promise<void> => {
  let objectUrl: string | null = null;

  try {
    onStart?.();

    const response = await api.get(url, { responseType: 'blob' });

    // Derive filename
    let downloadFilename = filename?.trim();
    if (!downloadFilename) {
      const cd = response.headers?.['content-disposition'] as string | undefined;
      const ct = response.headers?.['content-type'] as string | undefined;

      const cdName = parseContentDispositionFilename(cd);
      if (cdName) {
        downloadFilename = cdName;
      } else {
        const ext = extFromContentType(ct);
        downloadFilename = `export-${isoDatePrefix()}${ext || ''}`;
      }
    }

    // Build Blob
    const blob: Blob =
      response.data instanceof Blob ? response.data : new Blob([response.data]);

    // IE/Edge legacy
    // @ts-ignore - feature detection for old Edge/IE
    if (window.navigator && 'msSaveOrOpenBlob' in window.navigator) {
      // @ts-ignore
      (window.navigator as any).msSaveOrOpenBlob(blob, downloadFilename);
      onFinish?.();
      return;
    }

    // Modern browsers
    objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = downloadFilename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();

    onFinish?.();
  } catch (err: any) {
    // Try to surface server JSON error messages even when responseType='blob'
    try {
      const blob = err?.response?.data;
      const type: string | undefined = blob?.type;
      if (blob && type && type.includes('application/json')) {
        const text = await blob.text();
        const parsed = JSON.parse(text);
        if (parsed?.message) err.message = parsed.message;
      }
    } catch {
      // ignore parse errors
    }

    console.error('Download failed:', err);
    onError?.(err as Error);
  } finally {
    if (objectUrl) {
      window.URL.revokeObjectURL(objectUrl);
    }
  }
};

/**
 * Helper function to download files from the API
 */
export async function downloadFileHelper(options: {
  url: string;
  filename?: string;
  params?: Record<string, any>;
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}): Promise<void> {
  const { url, filename, params, onStart, onFinish, onError } = options;

  try {
    if (onStart) onStart();

    // Request the file as a blob
    const response = await api.get(url, {
      params,
      responseType: 'blob',
    });

    // Create a URL for the blob
    const blob = new Blob([response.data], {
      type: response.headers['content-type'],
    });
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a temporary link and click it to download
    const link = document.createElement('a');
    link.href = blobUrl;

    // Get filename from Content-Disposition header or use provided filename
    const contentDisposition = response.headers['content-disposition'];
    const serverFilename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : null;

    link.download = filename || serverFilename || 'download';
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    if (onFinish) onFinish();
  } catch (error) {
    console.error('Download error:', error);
    if (onError) onError(error as Error);
  }
}
