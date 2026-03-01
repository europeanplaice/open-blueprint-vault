import { FileValidator } from '@nestjs/common';

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  // DXF - no standard MIME; browsers vary
  'application/dxf',
  'image/vnd.dxf',
  'application/x-dxf',
  // DWG - no standard MIME
  'application/acad',
  'application/x-acad',
];

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.dxf',
  '.dwg',
];

function getExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

export class AcceptedFileTypeValidator extends FileValidator<Record<string, never>> {
  isValid(file: Express.Multer.File): boolean {
    if (ACCEPTED_MIME_TYPES.includes(file.mimetype)) return true;

    // Fallback to extension check (important for CAD files sent as application/octet-stream)
    const ext = getExtension(file.originalname);
    return ACCEPTED_EXTENSIONS.includes(ext);
  }

  buildErrorMessage(): string {
    return 'Unsupported file type. Accepted formats: PDF, PNG, JPG, TIFF, DXF, DWG';
  }
}
