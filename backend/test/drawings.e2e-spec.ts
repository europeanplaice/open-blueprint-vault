import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma.service';
import { S3Service } from './../src/s3.service';

describe('DrawingsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s3Service: S3Service;

  const mockPrismaService = {
    drawing: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue({
        uploadFile: jest.fn().mockResolvedValue('http://minio:9000/drawings/test.pdf'),
        deleteFile: jest.fn().mockResolvedValue(undefined),
        onModuleInit: jest.fn(),
      })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    s3Service = app.get<S3Service>(S3Service);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/drawings/:id (DELETE) should delete a drawing', async () => {
    const drawing = {
      id: 'delete-id',
      drawingNumber: 'E2E-DELETE-ME',
      name: 'To Be Deleted',
      fileUrl: 'http://minio:9000/drawings/delete-me.pdf',
      status: 'PENDING',
    };

    mockPrismaService.drawing.findUnique.mockResolvedValue(drawing);
    mockPrismaService.drawing.delete.mockResolvedValue(drawing);

    // 2. Delete it via API
    await request(app.getHttpServer())
      .delete(`/drawings/${drawing.id}`)
      .expect(200);

    // 4. Verify S3 delete was called
    expect(s3Service.deleteFile).toHaveBeenCalledWith(drawing.fileUrl);
    expect(mockPrismaService.drawing.delete).toHaveBeenCalledWith({ where: { id: drawing.id } });
  });
});
