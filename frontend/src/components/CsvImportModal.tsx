'use client';

import { useState } from 'react';
import { FileDropzone } from './FileDropzone';
import { CsvImportResult } from '../types/drawing';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function CsvImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: CsvImportModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Generate a simple CSV template
    const headers = ['drawingNumber', 'name', 'project', 'revision', 'customField1'];
    const row1 = ['DWG-001', 'Sample Part', 'Project A', 'Rev.A', 'Value1'];
    const csvContent = '\ufeff' + [headers.join(','), row1.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'metadata_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelected = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/drawings/metadata/csv`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result: CsvImportResult = await res.json();
        setImportResult(result);
        onImportSuccess(); // Trigger refresh in parent, but keep modal open to show result
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'CSV import failed');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      setError('An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setImportResult(null);
    setError(null);
    setIsUploading(false);
    onClose();
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
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '32px',
          width: '560px',
          maxWidth: '90%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'fadeInUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: '16px',
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            letterSpacing: '0.05em',
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
          }}
        >
          Import Metadata from CSV
        </h2>

        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '12px'
          }}>
            Upload a CSV file to bulk update drawing metadata.<br/>
            Required column: <code>drawingNumber</code><br/>
            All other columns are added or updated as metadata.
          </p>

          <button
            onClick={handleDownloadTemplate}
            style={{
              background: 'transparent',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DOWNLOAD TEMPLATE CSV
          </button>
        </div>

        {!importResult ? (
          <FileDropzone
            onFileSelected={handleFileSelected}
            isUploading={isUploading}
            accept={{ 'text/csv': ['.csv'] }}
            labels={{
              idle: 'UPLOAD CSV FILE',
              active: 'DROP CSV HERE',
              description: 'Drag and drop a CSV file, or click to select one'
            }}
          />
        ) : (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--status-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-success)'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Import Completed</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Updated {importResult.updated} drawing records
                </p>
              </div>
            </div>

            {importResult.notFound.length > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(255, 75, 75, 0.1)',
                border: '1px solid rgba(255, 75, 75, 0.2)',
                borderRadius: '4px'
              }}>
                <p style={{
                  margin: '0 0 8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#FF4B4B',
                  fontFamily: 'var(--font-mono)'
                }}>
                  SKIPPED RECORDS (NOT FOUND):
                </p>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  maxHeight: '100px',
                  overflowY: 'auto'
                }}>
                  {importResult.notFound.join(', ')}
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
               <button
                onClick={() => setImportResult(null)}
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
               >
                 UPLOAD ANOTHER FILE
               </button>
            </div>
          </div>
        )}

        {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 75, 75, 0.1)',
                border: '1px solid rgba(255, 75, 75, 0.22)',
                color: '#FF4B4B',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                marginBottom: '16px'
              }}
            >
              {error}
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            onClick={handleClose}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
