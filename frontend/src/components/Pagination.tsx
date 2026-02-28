import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        marginTop: '48px',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-mid)',
          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
          padding: '8px 16px',
          fontSize: '11px',
          letterSpacing: '0.1em',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          opacity: currentPage === 1 ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
            if (currentPage !== 1) {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
            }
        }}
        onMouseLeave={(e) => {
            if (currentPage !== 1) {
                e.currentTarget.style.borderColor = 'var(--border-mid)';
                e.currentTarget.style.color = 'var(--text-primary)';
            }
        }}
      >
        &lt; PREV
      </button>

      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
        }}
      >
        PAGE <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{currentPage}</span> OF {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-mid)',
          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
          padding: '8px 16px',
          fontSize: '11px',
          letterSpacing: '0.1em',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          opacity: currentPage === totalPages ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
            }
        }}
        onMouseLeave={(e) => {
            if (currentPage !== totalPages) {
                e.currentTarget.style.borderColor = 'var(--border-mid)';
                e.currentTarget.style.color = 'var(--text-primary)';
            }
        }}
      >
        NEXT &gt;
      </button>
    </div>
  );
};
