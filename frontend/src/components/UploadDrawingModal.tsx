import { useState, useRef } from 'react';
import { FileDropzone } from './FileDropzone';
import { DRAWING_FILE_EXTENSIONS_REGEX } from '../utils/fileType';

interface UploadDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function UploadDrawingModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadDrawingModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [splitPages, setSplitPages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(DRAWING_FILE_EXTENSIONS_REGEX, ''));
    formData.append('splitPages', String(splitPages));

    try {
      const res = await fetch(`${API_URL}/drawings/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert('Upload successful!');
        onUploadSuccess();
        onClose();
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('An error occurred');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '32px',
          width: '500px',
          maxWidth: '90%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: '24px',
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            letterSpacing: '0.05em',
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
          }}
        >
          Upload New Drawing
        </h2>

        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: 'var(--bg-elevated)',
            }}
          >
            <input
              type="checkbox"
              checked={splitPages}
              onChange={(e) => setSplitPages(e.target.checked)}
              disabled={isUploading}
              style={{ cursor: 'pointer' }}
            />
            SPLIT MULTI-PAGE PDFS INTO SEPARATE DRAWINGS{' '}
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>(PDF ONLY)</span>
          </label>
        </div>

        <FileDropzone onFileSelected={uploadFile} isUploading={isUploading} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            disabled={isUploading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
