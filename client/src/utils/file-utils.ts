/**
 * Utility functions for file operations
 */

// Format file size in bytes to human-readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get file type category from MIME type
export function getFileCategory(mimeType: string): 'document' | 'image' | 'archive' | 'code' | 'spreadsheet' | 'other' {
  if (
    mimeType.includes('text/plain') ||
    mimeType.includes('application/pdf') ||
    mimeType.includes('application/msword') ||
    mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  ) {
    return 'document';
  } else if (mimeType.includes('image/')) {
    return 'image';
  } else if (
    mimeType.includes('application/zip') ||
    mimeType.includes('application/x-zip-compressed') ||
    mimeType.includes('application/x-rar-compressed') ||
    mimeType.includes('application/x-tar')
  ) {
    return 'archive';
  } else if (
    mimeType.includes('text/html') ||
    mimeType.includes('application/javascript') ||
    mimeType.includes('text/css') ||
    mimeType.includes('application/json')
  ) {
    return 'code';
  } else if (
    mimeType.includes('application/vnd.ms-excel') ||
    mimeType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ) {
    return 'spreadsheet';
  } else {
    return 'other';
  }
}

// Calculate file statistics from a list of files
export function calculateFileStats(files: any[]) {
  const result = {
    total: files.length,
    documents: 0,
    images: 0,
    other: 0,
    totalSize: 0,
  };
  
  files.forEach(file => {
    result.totalSize += file.size;
    
    const category = getFileCategory(file.mimeType);
    if (category === 'document' || category === 'spreadsheet') {
      result.documents++;
    } else if (category === 'image') {
      result.images++;
    } else {
      result.other++;
    }
  });
  
  return result;
}

// Generate a shareable link for a file
export function generateShareLink(fileId: number): string {
  return `${window.location.origin}/s/${fileId}`;
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}
