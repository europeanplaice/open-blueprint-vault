export type DrawingRelationType = 'RELATED' | 'PARENT' | 'CHILD' | 'SUPERSEDES';

export interface DrawingRelation {
  id: string;
  fromDrawingId: string;
  toDrawingId: string;
  relationType: DrawingRelationType;
  createdAt: string;
  fromDrawing?: { id: string; drawingNumber: string; name: string | null };
  toDrawing?: { id: string; drawingNumber: string; name: string | null };
}

export interface DrawingRevision {
  id: string;
  drawingId: string;
  revision: string;
  fileUrl: string;
  reason: string | null;
  createdAt: string;
}

export interface Drawing {
  id: string;
  drawingNumber: string;
  name: string | null;
  createdAt: string;
  fileUrl: string;
  status: string;
  revision?: string | null;
  // Optional metadata. Customer-specific keys (for example order/work numbers) are stored here.
  metadata?: Record<string, string>;
  metadataSources?: Record<string, string>; // "HUMAN"
  relationsFrom?: DrawingRelation[];
  relationsTo?: DrawingRelation[];
  revisions?: DrawingRevision[];
}

export interface CsvImportResult {
  updated: number;
  notFound: string[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDrawings {
  data: Drawing[];
  meta: PaginationMeta;
}
