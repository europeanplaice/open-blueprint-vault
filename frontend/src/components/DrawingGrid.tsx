'use client';

import { Drawing } from '../types/drawing';
import { DrawingCard } from './DrawingCard';

interface DrawingGridProps {
  drawings: Drawing[];
  onDrawingClick: (drawing: Drawing) => void;
  onDelete: (drawing: Drawing) => void;
}

export function DrawingGrid({ drawings, onDrawingClick, onDelete }: DrawingGridProps) {
  if (drawings.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          border: '1px dashed var(--border)',
          borderRadius: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}
      >
        NO DRAWINGS FOUND
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '24px',
        animation: 'fadeInUp 0.5s ease',
      }}
    >
      {drawings.map((drawing) => (
        <DrawingCard
          key={drawing.id}
          drawing={drawing}
          onClick={onDrawingClick}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
