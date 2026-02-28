import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import Home from './page';
import { ThemeProvider } from '../context/ThemeContext';

// Mock PDFThumbnail to avoid 'react-pdf' ESM issues in Jest
jest.mock('../components/PDFThumbnail', () => ({
  PDFThumbnail: () => <div data-testid="pdf-thumbnail">Mock Thumbnail</div>,
}));

// Mock fetch global
global.fetch = jest.fn();
// Mock alert
window.alert = jest.fn();

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockEmptyPaginatedResponse = {
  data: [],
  meta: { total: 0, page: 1, limit: 24, totalPages: 0 },
};

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to setup fetch mock
  const setupFetchMock = (drawingsResponse: any = mockEmptyPaginatedResponse, uploadSuccess = true) => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/drawings/upload')) {
        return Promise.resolve({
          ok: uploadSuccess,
          json: async () => ({}),
        });
      }
      // Match /drawings but not /models or /upload
      if (typeof url === 'string' && url.includes('/drawings')) {
        return Promise.resolve({
          ok: true,
          json: async () => drawingsResponse,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  };

  it('renders loading state initially', async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    expect(screen.getByText('LOADING...')).toBeInTheDocument();
  });

  it('renders empty state when no drawings are returned', async () => {
    setupFetchMock();

    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('NO DRAWINGS REGISTERED')).toBeInTheDocument();
    });
  });

  it('renders drawings when data is returned', async () => {
    const mockDrawings = [
      {
        id: '1',
        drawingNumber: 'DWG-001',
        name: 'Part 1',
        createdAt: '2023-01-01T00:00:00.000Z',
        fileUrl: 'http://example.com/1.pdf',
        status: 'COMPLETED',
      },
    ];

    setupFetchMock({
      data: mockDrawings,
      meta: { total: 1, page: 1, limit: 24, totalPages: 1 },
    });

    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('DWG-001')).toBeInTheDocument();
    });
  });

  it('handles upload interaction', async () => {
    setupFetchMock();

    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('NO DRAWINGS REGISTERED')).toBeInTheDocument();
    });

    // 1. Click "Upload Drawing" to open the modal
    // Note: There might be multiple buttons with this text (one in header, one in empty state).
    // Using getAllByText and clicking the first one (header) is safe.
    const uploadButtons = screen.getAllByText('Upload Drawing');
    fireEvent.click(uploadButtons[0]);

    // 2. Wait for modal to open
    await waitFor(() => {
        expect(screen.getByText('Upload New Drawing')).toBeInTheDocument();
    });

    // 3. Find the file input within the modal
    // Since we removed the other file input, the only other one is CSV (accept .csv)
    // We can select by accept attribute to be safe
    // The dropzone input has accept=".pdf" (from dropzone config)
    // But react-dropzone puts accept on the input.
    // Let's try selecting by type="file" and ensuring it accepts pdf.

    // Actually, document.querySelectorAll might find 2 inputs: CSV and Modal PDF.
    // The Modal one should be in the document now.

    const inputs = document.querySelectorAll('input[type="file"]');
    // We expect one to accept .csv and one to accept .pdf (or be in the modal)
    // Let's filter for the one that is NOT the csv input
    const pdfInput = Array.from(inputs).find(input =>
        (input as HTMLInputElement).accept?.includes('.pdf') ||
        // react-dropzone sets accept attribute like "application/pdf,.pdf"
        (input as HTMLInputElement).accept?.includes('application/pdf')
    );

    if (!pdfInput) {
        throw new Error('PDF file input not found');
    }

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    await act(async () => {
      fireEvent.change(pdfInput, { target: { files: [file] } });
    });

    // Check if fetch was called with upload endpoint
    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/drawings/upload'),
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
    });

    // Check if alert was called
    await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Upload successful!');
    });
  });

  it('triggers search with query parameter', async () => {
    jest.useFakeTimers();
    setupFetchMock();

    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    // Initial fetch happens immediately (or shortly after mount)
    // We need to wait for the effect to run
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    const searchInput = screen.getByPlaceholderText('SEARCH DRAWINGS...');

    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Fast-forward debounce
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?q=test'));

    jest.useRealTimers();
  });

  it('clears search input when clear button is clicked', async () => {
    setupFetchMock();

    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    // Initial fetch
    await act(async () => {
      // Wait for initial effects
    });

    const searchInput = screen.getByPlaceholderText('SEARCH DRAWINGS...');

    // Type into input
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');

    // Find clear button
    const clearButton = screen.getByTitle('Clear search');
    expect(clearButton).toBeInTheDocument();

    // Click clear button
    fireEvent.click(clearButton);

    // Assert input is empty
    expect(searchInput).toHaveValue('');
    expect(clearButton).not.toBeInTheDocument();
  });
});
