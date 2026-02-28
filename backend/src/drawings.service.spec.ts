import { Test, TestingModule } from '@nestjs/testing';
import { DrawingsService } from './drawings.service';
import { PrismaService } from './prisma.service';
import { S3Service } from './s3.service';
import { DrawingsGateway } from './drawings/drawings.gateway';
import { Drawing } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';

// Mock pdf-lib
jest.mock('pdf-lib', () => {
  return {
    PDFDocument: {
      load: jest.fn(),
      create: jest.fn(),
    },
  };
});

describe('DrawingsService', () => {
  let service: DrawingsService;
  let prisma: PrismaService;
  let s3Service: S3Service;
  let drawingsGateway: DrawingsGateway;

  const mockDrawing: Drawing = {
    id: 'test-id',
    drawingNumber: 'DWG-123',
    name: 'Test Part',
    createdAt: new Date(),
    updatedAt: new Date(),
    fileUrl: 'http://minio/bucket/file.pdf',
    status: 'COMPLETED',
    metadata: null,
    revision: null,
  };

  const mockPrismaService = {
    drawing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    drawingRelation: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
    uploadFileBuffer: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockDrawingsGateway = {
    emitDrawingCreated: jest.fn(),
    emitDrawingUpdated: jest.fn(),
    emitDrawingDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: DrawingsGateway,
          useValue: mockDrawingsGateway,
        },
      ],
    }).compile();

    service = module.get<DrawingsService>(DrawingsService);
    prisma = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
    drawingsGateway = module.get<DrawingsGateway>(DrawingsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated drawings', async () => {
      mockPrismaService.drawing.count.mockResolvedValue(1);
      mockPrismaService.drawing.findMany.mockResolvedValue([mockDrawing]);

      const result = await service.findAll();
      expect(result).toEqual({
        data: [mockDrawing],
        meta: {
          total: 1,
          page: 1,
          limit: 24,
          totalPages: 1,
        },
      });
      expect(prisma.drawing.count).toHaveBeenCalled();
      expect(prisma.drawing.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 24,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return filtered and paginated drawings when query is provided', async () => {
      const query = 'test';
      (mockPrismaService.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockDrawing]);

      const result = await service.findAll(query, 1, 10);

      expect(result).toEqual({
        data: [mockDrawing],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('createFromUpload', () => {
    const mockFile = {
      buffer: Buffer.from('fake-pdf'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    it('should create a single drawing when splitPages is false', async () => {
      mockS3Service.uploadFile.mockResolvedValue('http://minio/bucket/file.pdf');
      const createSpy = jest.spyOn(service, 'create').mockResolvedValue(mockDrawing);

      const result = await service.createFromUpload(mockFile, { drawingNumber: 'D1' }, false);

      expect(result).toEqual([mockDrawing]);
      expect(s3Service.uploadFile).toHaveBeenCalledWith(mockFile);
      expect(createSpy).toHaveBeenCalledWith({
        drawingNumber: 'D1',
        name: undefined,
        fileUrl: 'http://minio/bucket/file.pdf',
      });
    });
  });

  describe('create', () => {
    it('should create a drawing', async () => {
      const createDto = {
        drawingNumber: 'DWG-123',
        name: 'Test Part',
        fileUrl: 'http://minio/bucket/file.pdf',
      };

      mockPrismaService.drawing.create.mockResolvedValue(mockDrawing);

      const result = await service.create(createDto);

      expect(result).toEqual(mockDrawing);
      expect(prisma.drawing.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          status: 'COMPLETED',
        },
      });
      expect(drawingsGateway.emitDrawingCreated).toHaveBeenCalledWith(mockDrawing);
    });
  });
});
