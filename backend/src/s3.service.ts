import { Injectable, OnModuleInit } from '@nestjs/common';
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service implements OnModuleInit {
  private s3Client: S3Client;
  private bucketName = process.env.MINIO_BUCKET || 'drawings';

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (error) {
      console.log(`Bucket ${this.bucketName} not found, creating...`);
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        
        // Configure policy to make bucket publicly readable
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`]
            }
          ]
        };

        await this.s3Client.send(new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(policy)
        }));
        console.log(`Bucket ${this.bucketName} policy set to public read.`);
      } catch (createError) {
        console.error('Failed to create bucket or set policy:', createError.message);
      }
    }
  }

  // Existing method (for Multer File)
  async uploadFile(file: Express.Multer.File): Promise<string> {
    // Multer decodes originalname as Latin-1; re-encode to get correct UTF-8
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const filename = `${Date.now()}-${decodedName}`;
    return this.uploadFileBuffer(file.buffer, filename, file.mimetype);
  }

  // New method (for Buffer)
  async uploadFileBuffer(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: buffer,
        ContentType: mimetype,
      }),
    );
    const publicUrl = process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    return `${publicUrl}/${this.bucketName}/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = fileUrl.split(`/${this.bucketName}/`).pop();
      if (!key) {
        console.warn(`Could not extract key from fileUrl: ${fileUrl}`);
        return;
      }

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      console.error(`Failed to delete file from S3: ${error.message}`);
    }
  }
}
