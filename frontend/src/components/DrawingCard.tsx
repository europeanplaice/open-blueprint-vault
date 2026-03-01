'use client';

import { useState } from 'react';
import { PDFThumbnail } from './PDFThumbnail';
import { Drawing } from '../types/drawing';
import { getFileExtension } from '../utils/fileType';

interface DrawingCardProps {
  drawing: Drawing;
  onClick: (drawing: Drawing) => void;
  onDelete: (drawing: Drawing) => void;
}

export function DrawingCard({ drawing, onClick, onDelete }: DrawingCardProps) {
  const [hovered, setHovered] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'var(--status-success)';
      case 'PROCESSING': return 'var(--status-processing)';
      case 'FAILED': return 'var(--status-error)';
      default: return 'var(--status-wait)';
    }
  };

  const statusColor = getStatusColor(drawing.status);

  return (
    <div
      onClick={() => onClick(drawing)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      className="group hover:border-[var(--accent)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
    >
      {/* Thumbnail Area */}
      <div style={{ position: 'relative' }}>
        <PDFThumbnail fileUrl={drawing.fileUrl} />

        {/* Delete Button (Overlay) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(drawing);
          }}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            width: '26px',
            height: '26px',
            background: 'var(--card-overlay-bg)',
            backdropFilter: 'blur(4px)',
            borderRadius: '4px',
            border: '1px solid var(--card-overlay-border)',
            color: 'var(--status-error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0)' : 'translateY(-5px)',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
          title="Delete Drawing"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* Status Badge Overlay */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '2px 6px',
            background: 'var(--card-overlay-bg)',
            backdropFilter: 'blur(4px)',
            borderRadius: '4px',
            border: `1px solid ${drawing.status === 'PROCESSING' ? statusColor : 'var(--card-overlay-border)'}`,
            fontSize: '9px',
            fontWeight: '600',
            color: statusColor,
            letterSpacing: '0.05em',
            animation: drawing.status === 'PROCESSING' ? 'pulseBlue 2s infinite' : 'none',
          }}
        >
          {drawing.status}
        </div>
      </div>

      {/* Info Area */}
      <div style={{ padding: '12px' }}>
        {/* Drawing Number */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--accent)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ opacity: 0.7 }}>#</span>
            {drawing.drawingNumber || 'NO NUMBER'}
          </div>
          {drawing.revision && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
              }}
            >
              {drawing.revision}
            </div>
          )}
        </div>

        {/* Name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            margin: '0 0 8px 0',
            overflow: 'hidden',
          }}
          title={drawing.name || 'Untitled'}
        >
          <h3
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {drawing.name || 'Untitled'}
          </h3>
          <span style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            background: 'var(--bg-base)',
            padding: '1px 4px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {getFileExtension(drawing.fileUrl).toUpperCase().replace('.', '')}
          </span>
        </div>
      </div>
    </div>
  );
}
