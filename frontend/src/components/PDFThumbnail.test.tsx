import { render, screen, act } from '@testing-library/react';
import { PDFThumbnail } from './PDFThumbnail';
import React from 'react';

// Mock react-pdf
jest.mock('react-pdf', () => {
  return {
    pdfjs: {
      GlobalWorkerOptions: {
        workerSrc: '',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Document: ({ children, onLoadError, file }: any) => {
      return (
        <div data-testid="pdf-document" data-file={file}>
          {children}
          {/* Expose a way to trigger error from test */}
          <button
            data-testid="trigger-abort-error"
            onClick={() => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              onLoadError(error);
            }}
          />
           <button
            data-testid="trigger-generic-error"
            onClick={() => {
              const error = new Error('Generic error');
              onLoadError(error);
            }}
          />
        </div>
      );
    },
    Page: () => <div data-testid="pdf-page" />,
  };
});

describe('PDFThumbnail', () => {
  it('suppresses AbortError and does not show failure state', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<PDFThumbnail fileUrl="http://example.com/test.pdf" />);

    // Wait for document to "load" (our mock renders immediately)
    const triggerBtn = await screen.findByTestId('trigger-abort-error');

    // Trigger AbortError
    await act(async () => {
      triggerBtn.click();
    });

    // Check that console.error was NOT called for this error
    expect(consoleSpy).not.toHaveBeenCalled();

    // Check that we are NOT showing the failure state
    // The failure state has text "PREVIEW FAILED"
    expect(screen.queryByText('PREVIEW FAILED')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('shows error state for generic errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<PDFThumbnail fileUrl="http://example.com/test.pdf" />);

    const triggerBtn = await screen.findByTestId('trigger-generic-error');

    // Trigger generic error
    await act(async () => {
      triggerBtn.click();
    });

    // Check that console.error WAS called
    expect(consoleSpy).toHaveBeenCalledWith('Error loading PDF:', expect.any(Error));

    // Check that we ARE showing the failure state
    expect(await screen.findByText('PREVIEW FAILED')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
