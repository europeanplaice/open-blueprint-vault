'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSocket } from '../../../components/SocketProvider';
import { Drawing } from '../../../types/drawing';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { EditDrawingModal } from '../../../components/EditDrawingModal';
import { RevisionUploadModal } from '../../../components/RevisionUploadModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ─── Fetch Helper ───────────────────────────────────────────────────────── */
async function getDrawing(id: string): Promise<Drawing | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${apiUrl}/drawings/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch drawing: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching drawing:', error);
    return null;
  }
}

/* ─── Client Component ───────────────────────────────────────────────────── */
export default function DrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const socket = useSocket();
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    params.then(async (p) => {
      const data = await getDrawing(p.id);
      if (!data) {
        // Handle 404 or redirect
        return;
      }
      setDrawing(data);
      setLoading(false);
    });
  }, [params]);

  // WebSocket listener (detail page)
  useEffect(() => {
    if (!socket || !drawing) return;

    const handleDrawingUpdated = (updated: Drawing) => {
      if (updated.id === drawing.id) {
        // Update state only for currently displayed drawing
        setDrawing(updated);
      }
    };

    socket.on('drawing.updated', handleDrawingUpdated);

    return () => {
      socket.off('drawing.updated', handleDrawingUpdated);
    };
  }, [socket, drawing]);

  const handleUpdate = async (id: string, data: Partial<Drawing>) => {
    try {
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

        // Refresh local data
        const updated = await getDrawing(id);
        if (updated) setDrawing(updated);

        setIsEditing(false);
    } catch (err) {
        console.error(err);
        alert('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!drawing) return;
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

      router.push('/');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete drawing.');
    }
  };

  const handleRevisionSuccess = async () => {
    if (!drawing) return;
    const updated = await getDrawing(drawing.id);
    if (updated) {
      setDrawing(updated);
      setViewingPdfUrl(null);
    }
  };

  // The currently displayed PDF URL (either the main drawing or a revision being viewed)
  const displayedPdfUrl = viewingPdfUrl || drawing?.fileUrl;

  if (loading || !drawing) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-base)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
        }}>
            LOADING...
        </div>
    );
  }

  const dateStr = new Date(drawing.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header - consistent with Home */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: '1px solid var(--border)',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            padding: '0 40px',
            height: '68px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
             <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
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

                <div>
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
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <ThemeToggle />
            <Link
                href="/"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    background: 'transparent',
                    border: '1px solid var(--border-mid)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: '600',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    borderRadius: '4px',
                }}
            >
                ← Back to List
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content - Dashboard Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: PDF Viewer */}
        <div style={{ flex: 1, background: '#000', position: 'relative' }}>
          {viewingPdfUrl && (
            <button
              onClick={() => setViewingPdfUrl(null)}
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 10,
                padding: '8px 16px',
                background: 'var(--accent)',
                border: 'none',
                color: '#0C0E13',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              BACK TO LATEST
            </button>
          )}
          <iframe
            src={displayedPdfUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Viewer"
          />
        </div>

        {/* Right: Metadata Panel */}
        <div
          style={{
            width: '400px',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border)',
            padding: '32px',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <span
                style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    alignSelf: 'flex-start',
                    background:
                        drawing.status === 'COMPLETED' ? 'rgba(75, 255, 100, 0.1)' :
                        drawing.status === 'PROCESSING' ? 'rgba(75, 158, 255, 0.1)' :
                        drawing.status === 'FAILED' ? 'rgba(255, 75, 75, 0.1)' :
                        'rgba(255, 255, 255, 0.05)',
                    border:
                        drawing.status === 'COMPLETED' ? '1px solid rgba(75, 255, 100, 0.22)' :
                        drawing.status === 'PROCESSING' ? '1px solid rgba(75, 158, 255, 0.22)' :
                        drawing.status === 'FAILED' ? '1px solid rgba(255, 75, 75, 0.22)' :
                        '1px solid rgba(255, 255, 255, 0.1)',
                    color:
                        drawing.status === 'COMPLETED' ? '#4BFF64' :
                        drawing.status === 'PROCESSING' ? '#4B9EFF' :
                        drawing.status === 'FAILED' ? '#FF4B4B' :
                        'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    animation: drawing.status === 'PROCESSING' ? 'pulseBlue 2s infinite' : 'none',
                    }}
                >
                    {drawing.status}
                </span>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsRevisionModalOpen(true)}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--blue, #4B9EFF)',
                            color: 'var(--blue, #4B9EFF)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: '600',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase' as const,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--blue, #4B9EFF)';
                            e.currentTarget.style.color = '#161B22';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--blue, #4B9EFF)';
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        Rev Up
                    </button>
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--accent)',
                            color: 'var(--accent)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: '600',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent)';
                            e.currentTarget.style.color = '#161B22';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--accent)';
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                    </button>

                    <button
                        onClick={handleDelete}
                        style={{
                            background: 'transparent',
                            border: '1px solid #FF4B4B',
                            color: '#FF4B4B',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: '600',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FF4B4B';
                            e.currentTarget.style.color = '#161B22';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#FF4B4B';
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>
            </div>

            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: '8px',
            }}>
                Drawing Number
            </div>
            <h2
                style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '24px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    letterSpacing: '0.05em',
                    margin: 0,
                }}
            >
                {drawing.drawingNumber}
                {drawing.revision && (
                  <span
                    style={{
                      marginLeft: '12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--blue, #4B9EFF)',
                      background: 'var(--blue-dim, rgba(75, 158, 255, 0.1))',
                      padding: '2px 10px',
                      borderRadius: '4px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {drawing.revision}
                  </span>
                )}
            </h2>
          </div>

          <dl style={{ display: 'grid', gap: '24px' }}>
             <div>
                <dt style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                }}>
                    Name
                </dt>
                <dd style={{
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    {drawing.name || '—'}
                </dd>
             </div>

             <div>
                <dt style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                }}>
                    Created At
                </dt>
                <dd style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    margin: 0
                }}>
                    {dateStr}
                </dd>
             </div>
          </dl>

          {/* Metadata Section if exists */}
          {drawing.metadata && (drawing.metadata as Record<string, unknown>) && Object.keys(drawing.metadata).length > 0 && (
            <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <h3 style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    marginBottom: '16px'
                }}>
                    Additional Metadata
                </h3>
                <dl style={{ display: 'grid', gap: '16px' }}>
                    {Object.entries(drawing.metadata as Record<string, unknown>).map(([key, value]) => (
                        <div key={key}>
                            <dt style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                color: 'var(--text-muted)',
                                letterSpacing: '0.1em',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                {key}
                                {drawing.metadataSources?.[key] === 'HUMAN' && (
                                    <span style={{
                                        fontSize: '8px',
                                        padding: '1px 4px',
                                        borderRadius: '2px',
                                        background: 'rgba(255, 204, 0, 0.1)',
                                        border: '1px solid rgba(255, 204, 0, 0.22)',
                                        color: '#FFCC00',
                                        letterSpacing: '0.05em'
                                    }}>
                                        MANUAL
                                    </span>
                                )}
                            </dt>
                            <dd style={{
                                fontSize: '14px',
                                color: 'var(--text-secondary)',
                                margin: 0,
                                wordBreak: 'break-all'
                            }}>
                                {String(value)}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
          )}

          {/* Revision History Section */}
          {drawing.revisions && drawing.revisions.length > 0 && (
            <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
              <h3 style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--accent)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}>
                Revision History
              </h3>

              <div style={{ display: 'grid', gap: '8px' }}>
                {drawing.revisions.map((rev) => {
                  const revDate = new Date(rev.createdAt).toLocaleString('en-US', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  });
                  const isCurrentlyViewing = viewingPdfUrl === rev.fileUrl;
                  const isLatest = rev.fileUrl === drawing.fileUrl;

                  return (
                    <div
                      key={rev.id}
                      style={{
                        padding: '10px 12px',
                        background: isCurrentlyViewing ? 'var(--accent-dim, rgba(255, 204, 0, 0.08))' : 'var(--bg-elevated)',
                        border: `1px solid ${isCurrentlyViewing ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => {
                        if (isLatest) {
                          setViewingPdfUrl(null);
                        } else {
                          setViewingPdfUrl(rev.fileUrl);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            letterSpacing: '0.05em',
                          }}>
                            {rev.revision}
                          </span>
                          {isLatest && (
                            <span style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: '600',
                              letterSpacing: '0.15em',
                              padding: '2px 6px',
                              background: 'rgba(75, 255, 100, 0.1)',
                              border: '1px solid rgba(75, 255, 100, 0.22)',
                              color: '#4BFF64',
                              textTransform: 'uppercase',
                            }}>
                              LATEST
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                        }}>
                          {revDate}
                        </span>
                      </div>
                      {rev.reason && (
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          marginTop: '4px',
                        }}>
                          {rev.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related Drawings Section */}
          {(() => {
            const allRelations = [
              ...(drawing.relationsFrom ?? []).map(r => ({
                id: r.id,
                relationType: r.relationType,
                related: r.toDrawing!,
              })),
              ...(drawing.relationsTo ?? []).map(r => ({
                id: r.id,
                relationType: r.relationType,
                related: r.fromDrawing!,
              })),
            ];

            if (allRelations.length === 0) return null;

            return (
              <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <h3 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--accent)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}>
                  Related Drawings
                </h3>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {allRelations.map(({ id, relationType, related }) => (
                    <Link
                      key={id}
                      href={`/drawings/${related.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        textDecoration: 'none',
                      }}
                    >
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          letterSpacing: '0.05em',
                        }}>
                          {related.drawingNumber}
                        </div>
                        {related.name && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                          }}>
                            {related.name}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        fontWeight: '600',
                        letterSpacing: '0.15em',
                        padding: '3px 8px',
                        border: '1px solid var(--border-mid)',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}>
                        {relationType}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>

        {/* Edit Modal */}
        <EditDrawingModal
            isOpen={isEditing}
            drawing={drawing}
            onClose={() => setIsEditing(false)}
            onSave={handleUpdate}
        />

        {/* Revision Upload Modal */}
        <RevisionUploadModal
            isOpen={isRevisionModalOpen}
            drawingId={drawing.id}
            onClose={() => setIsRevisionModalOpen(false)}
            onSuccess={handleRevisionSuccess}
        />
      </div>
    </main>
  );
}
