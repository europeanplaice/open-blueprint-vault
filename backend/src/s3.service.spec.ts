import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/client-s3');

describe('S3Service', () => {
  let service: S3Service;
  let s3ClientMock: any;

  beforeEach(async () => {
    s3ClientMock = {
      send: jest.fn(),
    };
    (S3Client as jest.Mock).mockImplementation(() => s3ClientMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create bucket if it does not exist', async () => {
      // First call to HeadBucketCommand fails (bucket not found)
      // Second call to CreateBucketCommand succeeds
      // Third call to PutBucketPolicyCommand succeeds
      s3ClientMock.send
        .mockRejectedValueOnce(new Error('Bucket not found'))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(s3ClientMock.send).toHaveBeenCalledTimes(3);
      // Check for HeadBucketCommand
      expect(s3ClientMock.send).toHaveBeenCalledWith(expect.any(HeadBucketCommand));
      // Check for CreateBucketCommand
      expect(s3ClientMock.send).toHaveBeenCalledWith(expect.any(CreateBucketCommand));
      // Check for PutBucketPolicyCommand
      expect(s3ClientMock.send).toHaveBeenCalledWith(expect.any(PutBucketPolicyCommand));
    });

    it('should not create bucket if it exists', async () => {
      s3ClientMock.send.mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(s3ClientMock.send).toHaveBeenCalledTimes(1);
      expect(s3ClientMock.send).toHaveBeenCalledWith(expect.any(HeadBucketCommand));
    });
  });

  describe('uploadFile', () => {
    it('should upload file and return url', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      s3ClientMock.send.mockResolvedValueOnce({});

      const result = await service.uploadFile(mockFile);

      expect(s3ClientMock.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result).toContain('http://localhost:9000/drawings/');
      expect(result).toContain('test.pdf');
    });

    it('should decode latin1-encoded Japanese filename from multer', async () => {
      // Multer encodes UTF-8 filenames as Latin-1 bytes
      const utf8Name = '図面.pdf';
      const latin1Name = Buffer.from(utf8Name, 'utf8').toString('latin1');
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: latin1Name,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      s3ClientMock.send.mockResolvedValueOnce({});

      const result = await service.uploadFile(mockFile);

      expect(result).toContain(utf8Name);
      expect(result).not.toContain(latin1Name);
    });
  });
});
