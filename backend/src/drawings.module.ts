import { Module } from '@nestjs/common';
import { DrawingsService } from './drawings.service';
import { DrawingsController } from './drawings.controller';
import { PrismaService } from './prisma.service';
import { S3Service } from './s3.service';
import { DrawingsGateway } from './drawings/drawings.gateway';

@Module({
  controllers: [DrawingsController],
  providers: [DrawingsService, PrismaService, S3Service, DrawingsGateway],
})
export class DrawingsModule {}
