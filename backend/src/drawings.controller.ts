import {
  Controller,
  Get, Post, Patch, Delete,
  Param, Body, Query,
  UseInterceptors, UploadedFile,
  ParseFilePipe, FileTypeValidator,
  NotFoundException, ConflictException, BadRequestException, Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DrawingsService } from './drawings.service';
import { S3Service } from './s3.service';
import { DrawingRelationType } from '@prisma/client';

@Controller('drawings')
export class DrawingsController {
  constructor(
    private readonly drawingsService: DrawingsService,
    private readonly s3Service: S3Service,
  ) {}

  // ── GET /drawings?q=... ───────────────────────────────────────────────────
  @Get()
  findAll(
    @Query('q') query?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 24;
    return this.drawingsService.findAll(query, pageNum, limitNum);
  }

  // ── GET /drawings/export ──────────────────────────────────────────────────
  // CSV export
  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="drawings.csv"')
  async exportToCsv() {
    return this.drawingsService.exportToCsv();
  }

  // ── GET /drawings/:id ─────────────────────────────────────────────────────
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const drawing = await this.drawingsService.findOne(id);
    if (!drawing) {
      throw new NotFoundException(`Drawing with ID ${id} not found`);
    }
    return drawing;
  }

  // ── DELETE /drawings/:id ──────────────────────────────────────────────────
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.drawingsService.remove(id);
  }

  // ── PATCH /drawings/:id ───────────────────────────────────────────────────
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body('drawingNumber') drawingNumber?: string,
    @Body('name') name?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    let metadataSourcesUpdate: Record<string, string> | undefined;

    if (metadata) {
      const current = await this.drawingsService.findOne(id);
      if (current) {
        const oldMeta = (current.metadata as Record<string, any>) || {};
        const oldSources =
          (current.metadataSources as Record<string, string>) || {};
        const newSources = { ...oldSources };

        // Check for added or modified keys
        Object.keys(metadata).forEach((key) => {
          if (metadata[key] !== oldMeta[key]) {
            newSources[key] = 'HUMAN';
          }
        });

        // Check for removed keys
        Object.keys(oldMeta).forEach((key) => {
          if (!(key in metadata)) {
            delete newSources[key];
          }
        });

        metadataSourcesUpdate = newSources;
      }
    }

    return this.drawingsService.update(id, {
      drawingNumber,
      name,
      metadata,
      metadataSources: metadataSourcesUpdate,
    });
  }

  // ── POST /drawings/upload ─────────────────────────────────────────────────
  // PDF file upload
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('drawingNumber') drawingNumber: string,
    @Body('name') name?: string,
    @Body('splitPages') splitPages?: string,
  ) {
    // Split pages only when splitPages is 'true'
    const shouldSplit = splitPages === 'true';

    return this.drawingsService.createFromUpload(
      file,
      { drawingNumber, name },
      shouldSplit,
    );
  }

  // ── POST /drawings/metadata/csv ───────────────────────────────────────────
  // Bulk import metadata from a CSV file
  // CSV format: identify drawing by "drawingNumber" column,
  // then merge remaining columns into metadata.
  @Post('metadata/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importMetadataFromCsv(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.drawingsService.importMetadataFromCsv(file.buffer);
  }

  // ── POST /drawings/:id/revisions ─────────────────────────────────────────
  // Create a new revision (PDF upload + revision number + reason)
  @Post(':id/revisions')
  @UseInterceptors(FileInterceptor('file'))
  async createRevision(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('revision') revision: string,
    @Body('reason') reason?: string,
  ) {
    if (!revision || !revision.trim()) {
      throw new BadRequestException('Revision number is required');
    }
    return this.drawingsService.createRevision(id, file, revision.trim(), reason?.trim());
  }

  // ── GET /drawings/:id/revisions ────────────────────────────────────────────
  @Get(':id/revisions')
  async getRevisions(@Param('id') id: string) {
    return this.drawingsService.getRevisions(id);
  }

  // ── POST /drawings/:id/relations ──────────────────────────────────────────
  // Body: { toDrawingId: string, relationType: DrawingRelationType }
  @Post(':id/relations')
  async addRelation(
    @Param('id') fromId: string,
    @Body('toDrawingId')  toDrawingId:  string,
    @Body('relationType') relationType: DrawingRelationType,
  ) {
    if (!Object.values(DrawingRelationType).includes(relationType)) {
      throw new ConflictException(`Invalid relationType: ${relationType}`);
    }
    try {
      return await this.drawingsService.addRelation(fromId, toDrawingId, relationType);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('This relation already exists');
      }
      throw error;
    }
  }

  // ── DELETE /drawings/:id/relations/:relationId ────────────────────────────
  @Delete(':id/relations/:relationId')
  async removeRelation(
    @Param('relationId') relationId: string,
  ) {
    return this.drawingsService.removeRelation(relationId);
  }
}
