export type FileCategory = 'pdf' | 'image' | 'cad' | 'unknown';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.tif', '.tiff'];
const CAD_EXTENSIONS = ['.dxf', '.dwg'];

export function getFileExtension(fileUrl: string): string {
  // Remove query params and hash, then extract extension
  const cleanUrl = fileUrl.split(/[?#]/)[0];
  const match = cleanUrl.match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

export function getFileCategory(fileUrl: string): FileCategory {
  const ext = getFileExtension(fileUrl);
  if (ext === '.pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (CAD_EXTENSIONS.includes(ext)) return 'cad';
  return 'unknown';
}

/** PNG and JPG can be displayed inline. TIFF cannot. */
export function isPreviewableImage(fileUrl: string): boolean {
  const ext = getFileExtension(fileUrl);
  return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
}

/** Returns true if the file can be previewed inline in the browser */
export function isInlinePreviewable(fileUrl: string): boolean {
  const category = getFileCategory(fileUrl);
  if (category === 'pdf') return true;
  if (category === 'image') return isPreviewableImage(fileUrl);
  return false;
}

/** Known file extensions for accepted drawing files */
export const DRAWING_FILE_EXTENSIONS_REGEX = /\.(pdf|png|jpe?g|tiff?|dxf|dwg)$/i;
