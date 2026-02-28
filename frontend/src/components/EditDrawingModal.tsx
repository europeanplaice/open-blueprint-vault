'use client';

import { useState, useEffect } from 'react';
import { Drawing } from '../types/drawing';

interface EditDrawingModalProps {
  isOpen: boolean;
  drawing: Drawing | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<Drawing>) => Promise<void>;
}

export function EditDrawingModal({ isOpen, drawing, onClose, onSave }: EditDrawingModalProps) {
  const [formData, setFormData] = useState({
    drawingNumber: '',
    name: '',
  });
  const [customMetadata, setCustomMetadata] = useState<{ key: string; value: string }[]>([]);
  const [newMeta, setNewMeta] = useState({ key: '', value: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (drawing) {
      setFormData({
        drawingNumber: drawing.drawingNumber || '',
        name:          drawing.name          || '',
      });
      if (drawing.metadata) {
        setCustomMetadata(
          Object.entries(drawing.metadata).map(([key, value]) => ({ key, value }))
        );
      } else {
        setCustomMetadata([]);
      }
    }
  }, [drawing]);

  if (!isOpen || !drawing) return null;

  const handleAddMeta = () => {
    if (!newMeta.key.trim()) return;
    setCustomMetadata([...customMetadata, { ...newMeta }]);
    setNewMeta({ key: '', value: '' });
  };

  const handleDeleteMeta = (index: number) => {
    setCustomMetadata(customMetadata.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const metadataObj: Record<string, string> = {};
    customMetadata.forEach((item) => {
      if (item.key.trim()) {
        metadataObj[item.key.trim()] = item.value;
      }
    });

    try {
      await onSave(drawing.id, {
        ...formData,
        metadata: metadataObj,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          padding: '32px',
          position: 'relative',
          animation: 'fadeInUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 24px',
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            letterSpacing: '0.1em',
            color: 'var(--text-primary)',
          }}
        >
          METADATA EDIT
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Standard Fields */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
              }}
            >
              DRAWING NO.
            </label>
            <input
              type="text"
              value={formData.drawingNumber}
              onChange={(e) => setFormData({ ...formData, drawingNumber: e.target.value })}
              style={{
                width: '100%',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
              }}
            >
              PART NAME
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Custom Metadata Section */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-mid)',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '12px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                fontWeight: '600',
              }}
            >
              CUSTOM METADATA
            </label>

            {/* List existing custom metadata */}
            {customMetadata.map((meta, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={meta.key}
                  readOnly
                  style={{
                    flex: 1,
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    padding: '8px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  value={meta.value}
                  onChange={(e) => {
                    const newMetadata = [...customMetadata];
                    newMetadata[index].value = e.target.value;
                    setCustomMetadata(newMetadata);
                  }}
                  style={{
                    flex: 2,
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    padding: '8px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteMeta(index)}
                  style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    padding: '0 10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Add new metadata */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="text"
                placeholder="Key"
                value={newMeta.key}
                onChange={(e) => setNewMeta({ ...newMeta, key: e.target.value })}
                style={{
                  flex: 1,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  padding: '8px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Value"
                value={newMeta.value}
                onChange={(e) => setNewMeta({ ...newMeta, value: e.target.value })}
                style={{
                  flex: 2,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  padding: '8px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleAddMeta}
                disabled={!newMeta.key.trim()}
                style={{
                  background: newMeta.key.trim() ? 'var(--blue-dim)' : 'var(--bg-base)',
                  border: newMeta.key.trim() ? '1px solid var(--blue-border)' : '1px solid var(--border)',
                  color: newMeta.key.trim() ? 'var(--blue)' : 'var(--text-muted)',
                  padding: '0 16px',
                  cursor: newMeta.key.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.1em',
                }}
              >
                ADD
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid var(--border-mid)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer',
                letterSpacing: '0.1em',
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '10px 24px',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                color: '#0C0E13',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: isSaving ? 'wait' : 'pointer',
                letterSpacing: '0.1em',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
