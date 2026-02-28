import { useState } from 'react';
import Link from 'next/link';
import { Drawing } from '../types/drawing';

export function DrawingRow({
  drawing,
  index,
  onEdit,
  onDelete,
}: {
  drawing: Drawing;
  index: number;
  onEdit: (drawing: Drawing) => void;
  onDelete: (drawing: Drawing) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const dateStr = new Date(drawing.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          bg: 'var(--status-success-bg)',
          border: 'var(--status-success-border)',
          color: 'var(--status-success)',
        };
      case 'PROCESSING':
        return {
          bg: 'var(--status-processing-bg)',
          border: 'var(--status-processing-border)',
          color: 'var(--status-processing)',
        };
      case 'FAILED':
        return {
          bg: 'var(--status-error-bg)',
          border: 'var(--status-error-border)',
          color: 'var(--status-error)',
        };
      default:
        return {
          bg: 'var(--status-wait-bg)',
          border: 'var(--status-wait-border)',
          color: 'var(--status-wait)',
        };
    }
  };

  const statusStyle = getStatusStyles(drawing.status);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid="drawing-row"
      style={{
        borderBottom: '1px solid var(--border)',
        background: hovered ? 'var(--bg-elevated)' : 'transparent', // Changed from accent-dim to elevated for cleaner look
        transition: 'background 0.15s ease',
        animation: `fadeInUp 0.35s ease ${index * 0.05}s both`,
      }}
    >
      {/* Status */}
      <td style={{ padding: '16px 24px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              background: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
              color: statusStyle.color,
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderRadius: '4px', // Added consistency
              animation: drawing.status === 'PROCESSING' ? 'pulseBlue 2s infinite' : 'none',
            }}
          >
            {drawing.status === 'COMPLETED' ? 'Completed' :
             drawing.status === 'PROCESSING' ? 'Processing' :
             drawing.status === 'FAILED' ? 'Failed' :
             'Pending'}
          </span>
      </td>

      {/* Drawing number */}
      <td
        style={{
          padding: '16px 24px',
          fontFamily: 'var(--font-mono)',
          fontWeight: '600',
          fontSize: '14px',
          letterSpacing: '0.06em',
          color: hovered ? 'var(--accent)' : 'var(--text-primary)',
          borderLeft: `3px solid ${hovered ? 'var(--accent)' : 'transparent'}`,
          transition: 'color 0.15s ease, border-color 0.15s ease',
        }}
      >
        {drawing.drawingNumber}
      </td>

      {/* Revision */}
      <td
        style={{
          padding: '16px 24px',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'var(--text-primary)',
          letterSpacing: '0.05em',
        }}
      >
        {drawing.revision ?? '—'}
      </td>

      {/* Part name */}
      <td
        style={{
          padding: '16px 24px',
          color: drawing.name ? 'var(--text-secondary)' : 'var(--text-muted)',
          fontSize: '14px',
          fontFamily: drawing.name ? 'inherit' : 'var(--font-mono)',
          letterSpacing: drawing.name ? 'normal' : '0.05em',
        }}
      >
        {drawing.name ?? '—'}
      </td>

      {/* Created date */}
      <td
        style={{
          padding: '16px 24px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
        }}
      >
        {dateStr}
      </td>

      {/* Actions */}
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => onEdit(drawing)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: hovered ? 'var(--accent)' : 'var(--text-secondary)',
              padding: 0,
              transition: 'color 0.15s ease',
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            EDIT
          </button>
          <Link
            href={`/drawings/${drawing.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: hovered ? 'var(--accent)' : 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            VIEW
          </Link>
          <button
            onClick={() => onDelete(drawing)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: hovered ? 'var(--status-error)' : 'var(--text-secondary)',
              padding: 0,
              transition: 'color 0.15s ease',
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            DEL
          </button>
        </div>
      </td>
    </tr>
  );
}
