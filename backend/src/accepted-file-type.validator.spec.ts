import { AcceptedFileTypeValidator } from './accepted-file-type.validator';

describe('AcceptedFileTypeValidator', () => {
  let validator: AcceptedFileTypeValidator;

  beforeEach(() => {
    validator = new AcceptedFileTypeValidator({});
  });

  function makeFile(mimetype: string, originalname: string): Express.Multer.File {
    return { mimetype, originalname } as Express.Multer.File;
  }

  describe('isValid', () => {
    it.each([
      ['application/pdf', 'drawing.pdf'],
      ['image/png', 'drawing.png'],
      ['image/jpeg', 'photo.jpg'],
      ['image/tiff', 'scan.tiff'],
      ['application/dxf', 'plan.dxf'],
      ['image/vnd.dxf', 'plan.dxf'],
      ['application/x-dxf', 'plan.dxf'],
      ['application/acad', 'plan.dwg'],
      ['application/x-acad', 'plan.dwg'],
    ])('should accept file with MIME type %s', (mimetype, originalname) => {
      expect(validator.isValid(makeFile(mimetype, originalname))).toBe(true);
    });

    it.each([
      ['application/octet-stream', 'drawing.pdf'],
      ['application/octet-stream', 'drawing.png'],
      ['application/octet-stream', 'drawing.jpg'],
      ['application/octet-stream', 'drawing.jpeg'],
      ['application/octet-stream', 'drawing.tif'],
      ['application/octet-stream', 'drawing.tiff'],
      ['application/octet-stream', 'drawing.dxf'],
      ['application/octet-stream', 'drawing.dwg'],
    ])('should accept file with unknown MIME (%s) but valid extension (%s)', (mimetype, originalname) => {
      expect(validator.isValid(makeFile(mimetype, originalname))).toBe(true);
    });

    it('should accept extension with mixed case', () => {
      expect(validator.isValid(makeFile('application/octet-stream', 'drawing.DWG'))).toBe(true);
      expect(validator.isValid(makeFile('application/octet-stream', 'drawing.Pdf'))).toBe(true);
    });

    it.each([
      ['application/octet-stream', 'spreadsheet.xlsx'],
      ['text/plain', 'readme.txt'],
      ['application/zip', 'archive.zip'],
      ['application/octet-stream', 'noextension'],
    ])('should reject file with MIME %s and name %s', (mimetype, originalname) => {
      expect(validator.isValid(makeFile(mimetype, originalname))).toBe(false);
    });
  });

  describe('buildErrorMessage', () => {
    it('should return a descriptive error message', () => {
      const message = validator.buildErrorMessage();
      expect(message).toContain('Unsupported file type');
      expect(message).toContain('PDF');
      expect(message).toContain('DWG');
    });
  });
});
