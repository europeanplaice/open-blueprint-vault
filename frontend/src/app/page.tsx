'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DrawingRow } from '../components/DrawingRow';
import { DrawingGrid } from '../components/DrawingGrid';
import { EditDrawingModal } from '../components/EditDrawingModal';
import { UploadDrawingModal } from '../components/UploadDrawingModal';
import { CsvImportModal } from '../components/CsvImportModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { Pagination } from '../components/Pagination';
import { Tooltip } from '../components/Tooltip';
import { Drawing, PaginationMeta, PaginatedDrawings } from '../types/drawing';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const fetchDrawings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      params.append('page', page.toString());
      params.append('limit', '24');

      const url = `${API_URL}/drawings?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText}`);
      }
      const result: PaginatedDrawings = await res.json();
      setDrawings(result.data);
      setMeta(result.meta);
    } catch (err) {
      console.error('Failed to fetch drawings:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  // Debounce input to update searchQuery
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== searchQuery) {
        setSearchQuery(inputValue);
        setPage(1); // Return to page 1 when search query changes
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue, searchQuery]);

  const handleCsvImportClick = () => {
    setIsCsvImportModalOpen(true);
  };

  const handleCsvExportClick = async () => {
    try {
      const res = await fetch(`${API_URL}/drawings/export`);
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drawings.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export CSV');
    }
  };

  const handleUpdate = async (id: string, data: Partial<Drawing>) => {
    const res = await fetch(`${API_URL}/drawings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Failed to update drawing');
    }

    fetchDrawings();
  };

  const handleDelete = async (drawing: Drawing) => {
    if (!confirm(`Delete drawing "${drawing.drawingNumber}"?\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/drawings/${drawing.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete drawing');
      }

      setDrawings((prev) => prev.filter((d) => d.id !== drawing.id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete drawing.');
    }
  };

  const handleCardClick = (drawing: Drawing) => {
    router.push(`/drawings/${drawing.id}`);
  };

  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: '1px solid var(--border)',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(12px)',
          animation: 'slideDown 0.4s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 40px',
            height: '68px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo mark + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Geometric diamond icon */}
            <div
              style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '2px solid var(--accent)',
                  transform: 'rotate(45deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '10px',
                  height: '10px',
                  background: 'var(--accent)',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>

            <div className="hidden md:block">
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  letterSpacing: '0.12em',
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                OPEN BLUEPRINT VAULT
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--accent)',
                  letterSpacing: '0.22em',
                  margin: '4px 0 0',
                  textTransform: 'uppercase',
                }}
              >
                DRAWING MANAGEMENT SYSTEM
              </p>
            </div>
          </div>

          {/* Upload button & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            <ThemeToggle />

            {/* View Toggle */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-elevated)',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              padding: '2px'
            }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  background: viewMode === 'list' ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                title="List View"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  background: viewMode === 'grid' ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                title="Grid View"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--text-muted)'
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="SEARCH DRAWINGS..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '8px 32px 8px 32px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.05em',
                  width: '240px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
              {inputValue && (
                <button
                  onClick={() => setInputValue('')}
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 md:px-5 py-2.5 whitespace-nowrap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                color: '#0C0E13',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                animation: 'pulseAccent 2.5s ease-in-out infinite',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#D4891A';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden md:inline">Upload Drawing</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '44px 40px 80px',
        }}
      >
        {/* Status line */}
        {!loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              animation: 'fadeIn 0.5s ease 0.1s both',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: 'var(--accent)', fontSize: '8px' }}>◆</span>
              <span>DRAWINGS DATABASE</span>
              <span style={{ color: 'var(--border-mid)' }}>──</span>
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>{drawings.length}</span>
                &nbsp;RECORDS
              </span>
            </div>

            {/* CSV buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <button
                onClick={handleCsvImportClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border-mid)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: '600',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-mid)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                CSV Import
                <Tooltip
                  content={`Bulk update drawing metadata from a CSV file\nRequired key column: drawingNumber`}
                  position="bottom"
                >
                  <div
                    className="flex items-center justify-center text-gray-400 hover:text-white cursor-help"
                    style={{ width: '12px', height: '12px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </Tooltip>
              </button>

              <button
                onClick={handleCsvExportClick}
                title="Export metadata as CSV"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border-mid)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: '600',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-mid)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV Export
              </button>
            </div>
          </div>
        )}

        {/* View Content */}
        {loading && drawings.length === 0 ? (
            /* Loading state (initial load) */
            <div style={{ padding: '96px 24px', textAlign: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '18px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    border: '2px solid var(--border-mid)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.75s linear infinite',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.2em',
                  }}
                >
                  LOADING...
                </span>
              </div>
            </div>
        ) : drawings.length === 0 ? (
           /* Empty state */
           <div style={{ padding: '96px 24px', textAlign: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px',
                  animation: 'fadeInUp 0.4s ease',
                }}
              >
                {/* Blueprint-style document icon */}
                <div style={{ position: 'relative' }}>
                  <svg
                    width="60"
                    height="60"
                    fill="none"
                    stroke="var(--border-mid)"
                    viewBox="0 0 24 24"
                    strokeWidth={0.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {/* Small accent dot */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      width: '8px',
                      height: '8px',
                      background: 'var(--accent)',
                      borderRadius: '50%',
                      opacity: 0.7,
                    }}
                  />
                </div>

                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      letterSpacing: '0.15em',
                      color: 'var(--text-secondary)',
                      margin: '0 0 10px',
                    }}
                  >
                    NO DRAWINGS REGISTERED
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--accent)',
                      letterSpacing: '0.06em',
                      background: 'transparent',
                      border: 'none',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Upload a PDF using the button in the top-right
                  </button>
                </div>
              </div>
            </div>
        ) : viewMode === 'list' ? (
          /* Table View */
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              animation: 'fadeInUp 0.5s ease 0.05s both',
            }}
          >
            {/* Top accent line */}
            <div
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, var(--accent), rgba(240,160,48,0) 60%)',
              }}
            />

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-mid)',
                  }}
                >
                  {['Status', 'Drawing Number', 'Revision', 'Part Name', 'Created At', 'Actions'].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: '13px 24px',
                        textAlign: 'left',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        fontWeight: '600',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {drawings.map((drawing, index) => (
                    <DrawingRow
                      key={drawing.id}
                      drawing={drawing}
                      index={index}
                      onEdit={setEditingDrawing}
                      onDelete={handleDelete}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <DrawingGrid
            drawings={drawings}
            onDrawingClick={handleCardClick}
            onDelete={handleDelete}
          />
        )}

        {/* Pagination */}
        {!loading && meta && (
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        )}

        <EditDrawingModal
          isOpen={!!editingDrawing}
          drawing={editingDrawing}
          onClose={() => setEditingDrawing(null)}
          onSave={handleUpdate}
        />

        <UploadDrawingModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={fetchDrawings}
        />

        <CsvImportModal
          isOpen={isCsvImportModalOpen}
          onClose={() => setIsCsvImportModalOpen(false)}
          onImportSuccess={fetchDrawings}
        />

        {/* Footer note */}
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            opacity: 0.6,
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              border: '1px solid var(--text-muted)',
              transform: 'rotate(45deg)',
            }}
          />
          <span>OPEN BLUEPRINT VAULT — DRAWING MANAGEMENT SYSTEM</span>
        </div>
      </div>
    </main>
  );
}
