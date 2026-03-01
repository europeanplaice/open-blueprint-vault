import {
  getFileExtension,
  getFileCategory,
  isPreviewableImage,
  isInlinePreviewable,
  DRAWING_FILE_EXTENSIONS_REGEX,
} from './fileType';

describe('getFileExtension', () => {
  it('extracts extension from simple URL', () => {
    expect(getFileExtension('http://example.com/drawing.pdf')).toBe('.pdf');
  });

  it('returns lowercase extension', () => {
    expect(getFileExtension('http://example.com/drawing.PDF')).toBe('.pdf');
    expect(getFileExtension('http://example.com/drawing.DwG')).toBe('.dwg');
  });

  it('strips query params before extracting extension', () => {
    expect(getFileExtension('http://example.com/file.png?token=abc')).toBe('.png');
  });

  it('strips hash before extracting extension', () => {
    expect(getFileExtension('http://example.com/file.jpg#section')).toBe('.jpg');
  });

  it('returns empty string for path without dots', () => {
    expect(getFileExtension('/uploads/file')).toBe('');
  });

  it('handles filenames with multiple dots', () => {
    expect(getFileExtension('http://example.com/my.drawing.v2.dxf')).toBe('.dxf');
  });
});

describe('getFileCategory', () => {
  it('returns "pdf" for PDF files', () => {
    expect(getFileCategory('http://example.com/file.pdf')).toBe('pdf');
  });

  it.each(['.png', '.jpg', '.jpeg', '.tif', '.tiff'])(
    'returns "image" for %s files',
    (ext) => {
      expect(getFileCategory(`http://example.com/file${ext}`)).toBe('image');
    },
  );

  it.each(['.dxf', '.dwg'])(
    'returns "cad" for %s files',
    (ext) => {
      expect(getFileCategory(`http://example.com/file${ext}`)).toBe('cad');
    },
  );

  it('returns "unknown" for unrecognized extensions', () => {
    expect(getFileCategory('http://example.com/file.xlsx')).toBe('unknown');
  });

  it('returns "unknown" for URL without extension', () => {
    expect(getFileCategory('http://example.com/file')).toBe('unknown');
  });
});

describe('isPreviewableImage', () => {
  it.each(['.png', '.jpg', '.jpeg'])(
    'returns true for %s (browser-previewable)',
    (ext) => {
      expect(isPreviewableImage(`http://example.com/img${ext}`)).toBe(true);
    },
  );

  it.each(['.tif', '.tiff'])(
    'returns false for %s (not browser-previewable)',
    (ext) => {
      expect(isPreviewableImage(`http://example.com/img${ext}`)).toBe(false);
    },
  );

  it('returns false for non-image files', () => {
    expect(isPreviewableImage('http://example.com/file.pdf')).toBe(false);
    expect(isPreviewableImage('http://example.com/file.dwg')).toBe(false);
  });
});

describe('isInlinePreviewable', () => {
  it('returns true for PDF files', () => {
    expect(isInlinePreviewable('http://example.com/file.pdf')).toBe(true);
  });

  it('returns true for previewable images (PNG, JPG)', () => {
    expect(isInlinePreviewable('http://example.com/file.png')).toBe(true);
    expect(isInlinePreviewable('http://example.com/file.jpg')).toBe(true);
  });

  it('returns false for TIFF (image but not previewable)', () => {
    expect(isInlinePreviewable('http://example.com/file.tiff')).toBe(false);
  });

  it('returns false for CAD files', () => {
    expect(isInlinePreviewable('http://example.com/file.dxf')).toBe(false);
    expect(isInlinePreviewable('http://example.com/file.dwg')).toBe(false);
  });

  it('returns false for unknown files', () => {
    expect(isInlinePreviewable('http://example.com/file.xlsx')).toBe(false);
  });
});

describe('DRAWING_FILE_EXTENSIONS_REGEX', () => {
  it.each(['file.pdf', 'file.png', 'file.jpg', 'file.jpeg', 'file.tif', 'file.tiff', 'file.dxf', 'file.dwg'])(
    'matches %s',
    (filename) => {
      expect(DRAWING_FILE_EXTENSIONS_REGEX.test(filename)).toBe(true);
    },
  );

  it('is case-insensitive', () => {
    expect(DRAWING_FILE_EXTENSIONS_REGEX.test('file.PDF')).toBe(true);
    expect(DRAWING_FILE_EXTENSIONS_REGEX.test('file.DWG')).toBe(true);
  });

  it('does not match unsupported extensions', () => {
    expect(DRAWING_FILE_EXTENSIONS_REGEX.test('file.xlsx')).toBe(false);
    expect(DRAWING_FILE_EXTENSIONS_REGEX.test('file.doc')).toBe(false);
  });
});
