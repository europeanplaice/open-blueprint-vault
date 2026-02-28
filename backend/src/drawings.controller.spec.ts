import { Test, TestingModule } from '@nestjs/testing';
import { DrawingsController } from './drawings.controller';
import { DrawingsService } from './drawings.service';
import { S3Service } from './s3.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('DrawingsController', () => {
  let controller: DrawingsController;
  let drawingsService: DrawingsService;
  let s3Service: S3Service;

  const mockDrawing = {
    id: 'test-id',
    drawingNumber: 'DWG-123',
    name: 'Test Part',
    createdAt: new Date(),
    updatedAt: new Date(),
    fileUrl: 'http://minio/bucket/file.pdf',
    status: 'PENDING',
  };

  const mockDrawingsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    createFromUpload: jest.fn(),
    update: jest.fn(),
    addRelation: jest.fn(),
    removeRelation: jest.fn(),
    importMetadataFromCsv: jest.fn(),
    remove: jest.fn(),
    exportToCsv: jest.fn(),
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrawingsController],
      providers: [
        {
          provide: DrawingsService,
          useValue: mockDrawingsService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    controller = module.get<DrawingsController>(DrawingsController);
    drawingsService = module.get<DrawingsService>(DrawingsService);
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated drawings', async () => {
      const expectedResult = {
        data: [mockDrawing],
        meta: { total: 1, page: 1, limit: 24, totalPages: 1 },
      };
      mockDrawingsService.findAll.mockResolvedValue(expectedResult);
      const result = await controller.findAll();
      expect(result).toEqual(expectedResult);
      expect(drawingsService.findAll).toHaveBeenCalledWith(undefined, 1, 24);
    });

    it('should pass query and pagination params to service', async () => {
      const expectedResult = {
        data: [mockDrawing],
        meta: { total: 1, page: 2, limit: 10, totalPages: 1 },
      };
      mockDrawingsService.findAll.mockResolvedValue(expectedResult);
      const query = 'test';
      const page = 2;
      const limit = 10;
      const result = await controller.findAll(query, page, limit);
      expect(result).toEqual(expectedResult);
      expect(drawingsService.findAll).toHaveBeenCalledWith(query, page, limit);
    });
  });

  describe('exportToCsv', () => {
    it('should call service.exportToCsv and return csv string', async () => {
      const csv = 'id,name\n1,test';
      mockDrawingsService.exportToCsv.mockResolvedValue(csv);

      const result = await controller.exportToCsv();

      expect(result).toBe(csv);
      expect(drawingsService.exportToCsv).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a drawing when found', async () => {
      const drawingWithRelations = { ...mockDrawing, relationsFrom: [], relationsTo: [] };
      mockDrawingsService.findOne.mockResolvedValue(drawingWithRelations);

      const result = await controller.findOne('test-id');

      expect(result).toEqual(drawingWithRelations);
      expect(drawingsService.findOne).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException when drawing is not found', async () => {
      mockDrawingsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a drawing with provided fields', async () => {
      const updated = { ...mockDrawing, name: 'New Name' };
      mockDrawingsService.update.mockResolvedValue(updated);

      const result = await controller.update(
        'test-id',
        'DWG-123',
        'New Name',
        undefined,
      );

      expect(result).toEqual(updated);
      expect(drawingsService.update).toHaveBeenCalledWith('test-id', {
        drawingNumber: 'DWG-123',
        name: 'New Name',
        metadata: undefined,
      });
    });
  });

  describe('uploadFile', () => {
    it('should delegate to service.createFromUpload with correct parameters', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;
      const drawingNumber = 'DWG-123';
      const name = 'Test Part';
      const splitPages = 'true';

      mockDrawingsService.createFromUpload.mockResolvedValue([mockDrawing]);

      const result = await controller.uploadFile(mockFile, drawingNumber, name, splitPages);

      expect(drawingsService.createFromUpload).toHaveBeenCalledWith(
        mockFile,
        { drawingNumber, name },
        true
      );
      expect(result).toEqual([mockDrawing]);
    });

    it('should pass false for splitPages when not provided or false', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;
      const drawingNumber = 'DWG-123';

      mockDrawingsService.createFromUpload.mockResolvedValue([mockDrawing]);

      await controller.uploadFile(mockFile, drawingNumber, undefined, 'false');

      expect(drawingsService.createFromUpload).toHaveBeenCalledWith(
        mockFile,
        { drawingNumber, name: undefined },
        false
      );
    });
  });

  describe('importMetadataFromCsv', () => {
    it('should delegate to service and return result', async () => {
      const mockFile = {
        buffer: Buffer.from('drawingNumber,orderNumber\nDWG-123,ORD-001'),
        originalname: 'metadata.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      const importResult = { updated: 1, notFound: [] };
      mockDrawingsService.importMetadataFromCsv.mockResolvedValue(importResult);

      const result = await controller.importMetadataFromCsv(mockFile);

      expect(result).toEqual(importResult);
      expect(drawingsService.importMetadataFromCsv).toHaveBeenCalledWith(mockFile.buffer);
    });
  });

  describe('addRelation', () => {
    it('should create a relation and return it', async () => {
      const mockRelation = {
        id: 'rel-1',
        fromDrawingId: 'test-id',
        toDrawingId: 'other-id',
        relationType: 'RELATED',
        createdAt: new Date(),
      };
      mockDrawingsService.addRelation.mockResolvedValue(mockRelation);

      const result = await controller.addRelation('test-id', 'other-id', 'RELATED' as any);

      expect(result).toEqual(mockRelation);
      expect(drawingsService.addRelation).toHaveBeenCalledWith('test-id', 'other-id', 'RELATED');
    });

    it('should throw ConflictException for invalid relationType', async () => {
      await expect(
        controller.addRelation('test-id', 'other-id', 'INVALID_TYPE' as any),
      ).rejects.toThrow(ConflictException);
      expect(drawingsService.addRelation).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when Prisma P2002 unique violation occurs', async () => {
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockDrawingsService.addRelation.mockRejectedValue(prismaError);

      await expect(
        controller.addRelation('test-id', 'other-id', 'RELATED' as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should re-throw non-P2002 errors', async () => {
      const networkError = new Error('DB connection failed');
      mockDrawingsService.addRelation.mockRejectedValue(networkError);

      await expect(
        controller.addRelation('test-id', 'other-id', 'RELATED' as any),
      ).rejects.toThrow('DB connection failed');
    });
  });

  describe('removeRelation', () => {
    it('should delete a relation and return it', async () => {
      const mockRelation = {
        id: 'rel-1',
        fromDrawingId: 'test-id',
        toDrawingId: 'other-id',
        relationType: 'RELATED',
        createdAt: new Date(),
      };
      mockDrawingsService.removeRelation.mockResolvedValue(mockRelation);

      const result = await controller.removeRelation('rel-1');

      expect(result).toEqual(mockRelation);
      expect(drawingsService.removeRelation).toHaveBeenCalledWith('rel-1');
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockDrawingsService.remove.mockResolvedValue(mockDrawing);
      const result = await controller.remove('test-id');
      expect(result).toEqual(mockDrawing);
      expect(drawingsService.remove).toHaveBeenCalledWith('test-id');
    });
  });
});
