'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

let pdfComponentsPromise: Promise<typeof import('react-pdf')> | null = null;

function loadPdfComponents() {
  if (!pdfComponentsPromise) {
    pdfComponentsPromise = import('react-pdf').then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
      return mod;
    });
  }

  return pdfComponentsPromise;
}

const Document = dynamic(() => loadPdfComponents().then(mod => mod.Document), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
const Page = dynamic(() => loadPdfComponents().then(mod => mod.Page), { ssr: false });

interface PDFThumbnailProps {
  fileUrl: string;
  width?: number;
}

const LoadingSpinner = () => (
  <div
    style={{
      width: '100%',
      aspectRatio: '1 / 1.414',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-elevated)',
    }}
  >
    <div
      style={{
        width: '20px',
        height: '20px',
        border: '2px solid var(--border-mid)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }}
    />
  </div>
);

export function PDFThumbnail({ fileUrl, width = 280 }: PDFThumbnailProps) {
  // Fix for local docker environment: replace internal minio host with localhost
  const effectiveUrl = fileUrl.replace('http://minio:9000', 'http://localhost:9000');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function onDocumentLoadSuccess() {
    // Document loaded, but wait for Page to render to set loading false
    // so we can get correct dimensions
  }

  function onDocumentLoadError(err: Error) {
    // Ignore abort errors during unmount/cancellation to prevent "signal is aborted without reason"
    if (err.name === 'AbortError' || err.message.includes('aborted')) {
      return;
    }
    console.error('Error loading PDF:', err);
    setError(true);
    setLoading(false);
  }

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1.414', // A4 aspect ratio approx
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-elevated)',
          color: 'var(--text-muted)',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span style={{ fontSize: '10px' }}>PREVIEW FAILED</span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        // Use fixed aspect ratio only while loading to prevent layout shift initially,
        // then let the content (Page) dictate the height.
        ...(loading ? { aspectRatio: '1 / 1.414' } : {}),
        minHeight: '200px', // Prevent collapse if loading is fast or erratic
        background: 'var(--bg-elevated)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {loading && (
         <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
             <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--border-mid)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.75s linear infinite',
                }}
              />
          </div>
      )}

      <Document
        file={effectiveUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={null} // Handled by our state/overlay
        error={null}   // Handled by our state
        className="pdf-document"
      >
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
          onLoadSuccess={() => setLoading(false)}
          onLoadError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      </Document>
    </div>
  );
}
