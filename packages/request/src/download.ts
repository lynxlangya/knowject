export function downloadFile(blob: Blob, filename?: string) {
  if (typeof window === 'undefined') return blob;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return blob;
}

export function getFilenameFromDisposition(disposition: string | null): string | undefined {
  if (!disposition) return undefined;
  
  // Try to match filename*=utf-8''filename or filename="filename"
  const utf8FilenameRegex = /filename\*=utf-8''([^;]+)/;
  const filenameRegex = /filename="?([^";]+)"?/;

  const utf8Match = disposition.match(utf8FilenameRegex);
  if (utf8Match && utf8Match[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const match = disposition.match(filenameRegex);
  if (match && match[1]) {
    return match[1];
  }

  return undefined;
}
