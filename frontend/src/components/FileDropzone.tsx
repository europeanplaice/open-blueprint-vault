'use client';

import { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';

interface FileDropzoneLabels {
  idle: string;
  active: string;
  description: string;
}

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  /**
   * react-dropzone accept option
   * Default: { 'application/pdf': ['.pdf'] }
   */
  accept?: Accept;
  /**
   * Display labels
   * Default: PDF upload labels
   */
  labels?: FileDropzoneLabels;
}

const DEFAULT_LABELS: FileDropzoneLabels = {
  idle: 'UPLOAD DRAWING',
  active: 'DROP FILE HERE',
  description: 'Drag and drop a file (PDF, PNG, JPG, TIFF, DXF, DWG), or click to select one',
};

const DEFAULT_ACCEPT: Accept = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tif', '.tiff'],
  'application/dxf': ['.dxf'],
  'application/acad': ['.dwg'],
  'application/octet-stream': ['.dxf', '.dwg'],
};

export function FileDropzone({
  onFileSelected,
  isUploading,
  accept = DEFAULT_ACCEPT,
  labels = DEFAULT_LABELS,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border-mid)'}`,
        borderRadius: '8px',
        background: isDragActive ? 'var(--accent-dim)' : 'rgba(0,0,0,0.2)',
        padding: '32px',
        textAlign: 'center',
        cursor: isUploading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        outline: 'none',
      }}
    >
      <input {...getInputProps()} />

      <div
        style={{
          color: isDragActive ? 'var(--accent)' : 'var(--text-secondary)',
          transition: 'color 0.2s ease',
        }}
      >
        <svg
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ opacity: isDragActive ? 1 : 0.7 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>

      <div>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '0.1em',
            color: isDragActive ? 'var(--accent)' : 'var(--text-primary)',
            margin: '0 0 4px',
            textTransform: 'uppercase',
          }}
        >
          {isDragActive ? labels.active : labels.idle}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          {labels.description}
        </p>
      </div>
    </div>
  );
}
