import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { S3Service } from './s3.service';
import { Drawing, DrawingRelation, DrawingRelationType, DrawingRevision, Prisma } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import * as path from 'path';

export type DrawingWithRelations = Drawing & {
  relationsFrom: (DrawingRelation & { toDrawing: Pick<Drawing, 'id' | 'drawingNumber' | 'name'> })[];
  relationsTo:   (DrawingRelation & { fromDrawing: Pick<Drawing, 'id' | 'drawingNumber' | 'name'> })[];
};

export interface CsvImportResult {
  updated: number;
  notFound: string[];
}

@Injectable()
export class DrawingsService {
  private readonly logger = new Logger(DrawingsService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async findAll(query?: string, page: number = 1, limit: number = 24): Promise<{ data: Drawing[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    try {
      const skip = (page - 1) * limit;

      if (!query) {
        const [total, data] = await Promise.all([
          this.prisma.drawing.count(),
          this.prisma.drawing.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        const totalPages = Math.ceil(total / limit);
        return {
          data,
          meta: {
            total,
            page,
            limit,
            totalPages,
          },
        };
      }

      const searchPattern = `%${query}%`;
      // Get total count
      const countResult: { count: bigint }[] = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Drawing"
        WHERE
          "drawingNumber"     ILIKE ${searchPattern}
          OR "name"           ILIKE ${searchPattern}
          OR "metadata"::text ILIKE ${searchPattern}
      `;
      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      // Fetch requested page
      const data = await this.prisma.$queryRaw<Drawing[]>`
        SELECT * FROM "Drawing"
        WHERE
          "drawingNumber"     ILIKE ${searchPattern}
          OR "name"           ILIKE ${searchPattern}
          OR "metadata"::text ILIKE ${searchPattern}
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to find drawings with query "${query}": ${error.message}`, error.stack);
      throw error;
    }
  }

  async create(data: Prisma.DrawingCreateInput): Promise<Drawing> {
    const drawing = await this.prisma.drawing.create({
      data: {
        ...data,
        status: 'COMPLETED',
      },
    });

    return drawing;
  }

  /**
   * Upload file and create drawing records.
   * If splitPages=true and the file is a PDF, split into one drawing per page.
   */
  async createFromUpload(
    file: Express.Multer.File,
    metadata: { drawingNumber?: string; name?: string },
    splitPages: boolean = false,
  ): Promise<Drawing[]> {
    const isPdf = file.mimetype === 'application/pdf' ||
      path.extname(file.originalname).toLowerCase() === '.pdf';

    if (!splitPages || !isPdf) {
      // Standard single-file upload
      const fileUrl = await this.s3Service.uploadFile(file);
      const drawing = await this.create({
        drawingNumber: metadata.drawingNumber || `DWG-${Date.now()}`,
        name: metadata.name,
        fileUrl,
      });
      return [drawing];
    }

    // PDF page splitting
    try {
      const pdfDoc = await PDFDocument.load(file.buffer);
      const pageCount = pdfDoc.getPageCount();
      const drawings: Drawing[] = [];

      for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        const buffer = Buffer.from(pdfBytes);

        // Build filename (example: original_p1.pdf)
        const ext = path.extname(file.originalname);
        const originalName = file.originalname.replace(new RegExp(`\\${ext}$`, 'i'), '');
        const filename = `${Date.now()}-${originalName}_p${i + 1}.pdf`;

        const fileUrl = await this.s3Service.uploadFileBuffer(buffer, filename, 'application/pdf');

        // Append page index to drawing number (example: DWG-001-1)
        let drawingNumber = metadata.drawingNumber;
        if (drawingNumber) {
            drawingNumber = `${drawingNumber}-${i + 1}`;
        } else {
            drawingNumber = `DWG-${Date.now()}-${i + 1}`;
        }

        const drawing = await this.create({
          drawingNumber,
          name: metadata.name ? `${metadata.name} (${i + 1})` : undefined,
          fileUrl,
        });

        drawings.push(drawing);
      }
      return drawings;
    } catch (error) {
      this.logger.error(`Failed to split PDF: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process/split PDF file');
    }
  }

  async update(id: string, data: Prisma.DrawingUpdateInput): Promise<Drawing> {
    const updated = await this.prisma.drawing.update({
      where: { id },
      data,
    });
    return updated;
  }

  async findOne(id: string): Promise<DrawingWithRelations | null> {
    return this.prisma.drawing.findUnique({
      where: { id },
      include: {
        relationsFrom: {
          include: {
            toDrawing: {
              select: { id: true, drawingNumber: true, name: true },
            },
          },
        },
        relationsTo: {
          include: {
            fromDrawing: {
              select: { id: true, drawingNumber: true, name: true },
            },
          },
        },
        revisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async addRelation(
    fromDrawingId: string,
    toDrawingId: string,
    relationType: DrawingRelationType,
  ): Promise<DrawingRelation> {
    return this.prisma.drawingRelation.create({
      data: { fromDrawingId, toDrawingId, relationType },
    });
  }

  async removeRelation(relationId: string): Promise<DrawingRelation> {
    return this.prisma.drawingRelation.delete({
      where: { id: relationId },
    });
  }

  async remove(id: string): Promise<Drawing> {
    const drawing = await this.prisma.drawing.findUnique({ where: { id } });
    if (!drawing) {
      throw new NotFoundException(`Drawing with ID ${id} not found`);
    }

    if (drawing.fileUrl) {
      await this.s3Service.deleteFile(drawing.fileUrl);
    }

    const deleted = await this.prisma.drawing.delete({
      where: { id },
    });
    return deleted;
  }

  // ── Bulk CSV metadata import ──────────────────────────────────────────────
  // CSV format:
  //   Row 1: Header row. "drawingNumber" is required. Other columns become metadata keys.
  //   Row 2+: Data rows. Match drawings by drawingNumber and merge remaining key-values into metadata.
  //
  // Example:
  //   drawingNumber,orderNumber,workNumber,project
  //   DWG-001,ORD-001,WO-001,Project A
  //   DWG-002,ORD-002,WO-002,Project B
  async importMetadataFromCsv(csvBuffer: Buffer): Promise<CsvImportResult> {
    const { headers, rows } = this.parseCsv(csvBuffer);

    // Find drawingNumber column (case-insensitive)
    const drawingNumberCol = headers.find(
      h => h.toLowerCase() === 'drawingnumber',
    );
    if (!drawingNumberCol) {
      throw new BadRequestException(
        'CSV must include a "drawingNumber" column',
      );
    }

    let updated = 0;
    const notFound: string[] = [];

    for (const row of rows) {
      const drawingNumber = row[drawingNumberCol]?.trim();
      if (!drawingNumber) continue;

      const matchingDrawings = await this.prisma.drawing.findMany({
        where: { drawingNumber },
      });

      if (matchingDrawings.length === 0) {
        notFound.push(drawingNumber);
        continue;
      }

      for (const drawing of matchingDrawings) {
        // Merge with existing metadata (CSV values overwrite existing values)
        const existing = (drawing.metadata as Record<string, string>) ?? {};
        const merged: Record<string, string> = { ...existing };

        const existingSources =
          (drawing.metadataSources as Record<string, string>) ?? {};
        const mergedSources: Record<string, string> = { ...existingSources };

        for (const header of headers) {
          if (header === drawingNumberCol) continue;
          const value = row[header]?.trim();
          if (value !== undefined && value !== '') {
            merged[header] = value;
            mergedSources[header] = 'HUMAN';
          }
        }

        await this.prisma.drawing.update({
          where: { id: drawing.id },
          data: {
            metadata: merged,
            metadataSources: mergedSources,
          },
        });
        updated++;
      }
    }

    return { updated, notFound };
  }

  // ── Lightweight CSV parser ────────────────────────────────────────────────
  // Handles RFC 4180 quoting, commas, and newlines.
  // Also supports UTF-8 files with BOM from Excel.
  private parseCsv(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
    // Remove BOM (EF BB BF)
    let text = buffer.toString('utf-8');
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return { headers: [], rows: [] };
    }

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const values = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? '';
      });
      return row;
    });

    return { headers, rows };
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  // Export drawing data and metadata as CSV
  async exportToCsv(): Promise<string> {
    const drawings = await this.prisma.drawing.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Collect unique metadata keys
    const metadataKeys = new Set<string>();
    drawings.forEach((d) => {
      if (
        d.metadata &&
        typeof d.metadata === 'object' &&
        !Array.isArray(d.metadata)
      ) {
        Object.keys(d.metadata).forEach((k) => metadataKeys.add(k));
      }
    });
    const sortedMetadataKeys = Array.from(metadataKeys).sort();

    // Build headers
    const headers = [
      'id',
      'drawingNumber',
      'name',
      'status',
      'createdAt',
      'updatedAt',
      'fileUrl',
      ...sortedMetadataKeys,
    ];

    // Build data rows
    const rows = drawings.map((d) => {
      const metadata = (d.metadata as Record<string, any>) || {};
      const row = [
        d.id,
        d.drawingNumber,
        d.name,
        d.status,
        d.createdAt.toISOString(),
        d.updatedAt.toISOString(),
        d.fileUrl,
        ...sortedMetadataKeys.map((k) => metadata[k] ?? ''),
      ];
      return row.map((val) => this.escapeCsvValue(val)).join(',');
    });

    // Return CSV string with BOM
    return '\ufeff' + [headers.join(','), ...rows].join('\n');
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async createRevision(
    drawingId: string,
    file: Express.Multer.File,
    revision: string,
    reason?: string,
  ): Promise<DrawingRevision> {
    const drawing = await this.prisma.drawing.findUnique({ where: { id: drawingId } });
    if (!drawing) {
      throw new NotFoundException(`Drawing with ID ${drawingId} not found`);
    }

    // Upload the new PDF to MinIO
    const newFileUrl = await this.s3Service.uploadFile(file);

    // Save the current state as a revision history record (old revision)
    if (drawing.fileUrl) {
      await this.prisma.drawingRevision.create({
        data: {
          drawingId,
          revision: drawing.revision || 'initial',
          fileUrl: drawing.fileUrl,
          reason: null,
        },
      });
    }

    // Create the new revision record
    const newRevision = await this.prisma.drawingRevision.create({
      data: {
        drawingId,
        revision,
        fileUrl: newFileUrl,
        reason: reason || null,
      },
    });

    // Update the drawing to point to the new file and revision
    await this.prisma.drawing.update({
      where: { id: drawingId },
      data: {
        fileUrl: newFileUrl,
        revision,
      },
    });

    return newRevision;
  }

  async getRevisions(drawingId: string): Promise<DrawingRevision[]> {
    return this.prisma.drawingRevision.findMany({
      where: { drawingId },
      orderBy: { createdAt: 'desc' },
    });
  }

}
