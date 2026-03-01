'use client';

import { useState } from 'react';
import { FileDropzone } from './FileDropzone';

interface RevisionUploadModalProps {
  isOpen: boolean;
  drawingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function RevisionUploadModal({ isOpen, drawingId, onClose, onSuccess }: RevisionUploadModalProps) {
  const [revision, setRevision] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!revision.trim()) {
      setError('Please enter a revision number');
      return;
    }
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('revision', revision.trim());
      if (reason.trim()) {
        formData.append('reason', reason.trim());
      }

      const res = await fetch(`${API_URL}/drawings/${drawingId}/revisions`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to create revision');
      }

      setRevision('');
      setReason('');
      setFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create revision');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setRevision('');
      setReason('');
      setFile(null);
      setError('');
      onClose();
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
      onClick={handleClose}
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
          REVISION UP
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              REVISION NO. *
            </label>
            <input
              type="text"
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              placeholder="e.g. Rev.A, 2, B1..."
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
              REASON (OPTIONAL)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for change..."
              rows={3}
              style={{
                width: '100%',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
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
              NEW FILE *
            </label>
            {file ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="20" height="20" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                    {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0 4px',
                  }}
                >
                  &times;
                </button>
              </div>
            ) : (
              <FileDropzone onFileSelected={setFile} isUploading={isUploading} />
            )}
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 75, 75, 0.1)',
                border: '1px solid rgba(255, 75, 75, 0.22)',
                color: '#FF4B4B',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid var(--border-mid)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.1em',
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isUploading || !revision.trim() || !file}
              style={{
                padding: '10px 24px',
                background: isUploading || !revision.trim() || !file ? 'var(--bg-base)' : 'var(--accent)',
                border: `1px solid ${isUploading || !revision.trim() || !file ? 'var(--border)' : 'var(--accent)'}`,
                color: isUploading || !revision.trim() || !file ? 'var(--text-muted)' : '#0C0E13',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: isUploading || !revision.trim() || !file ? 'not-allowed' : 'pointer',
                letterSpacing: '0.1em',
              }}
            >
              {isUploading ? 'UPLOADING...' : 'CREATE REVISION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
