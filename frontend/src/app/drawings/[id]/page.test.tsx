import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DrawingPage from './page';
import { ThemeProvider } from '../../../context/ThemeContext';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock EditDrawingModal
jest.mock('../../../components/EditDrawingModal', () => ({
  EditDrawingModal: () => <div data-testid="edit-modal">Edit Modal</div>,
}));

// Mock window.alert and confirm
window.alert = jest.fn();
window.confirm = jest.fn();
global.fetch = jest.fn();

const mockDrawing = {
  id: '123',
  drawingNumber: 'DWG-001',
  name: 'Test Part',
  status: 'COMPLETED',
  createdAt: '2023-01-01T00:00:00.000Z',
  fileUrl: 'http://example.com/file.pdf',
  metadata: { key: 'value' },
  relationsFrom: [],
  relationsTo: [],
};

describe('DrawingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
     (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

     render(
       <ThemeProvider>
         <DrawingPage params={Promise.resolve({ id: '123' })} />
       </ThemeProvider>
     );
     expect(screen.getByText('LOADING...')).toBeInTheDocument();
  });

  it('renders drawing details', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDrawing,
    });

    render(
      <ThemeProvider>
        <DrawingPage params={Promise.resolve({ id: '123' })} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('DWG-001')).toBeInTheDocument();
      expect(screen.getByText('Test Part')).toBeInTheDocument();
    });
  });

  it('handles delete cancellation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDrawing,
    });
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(
      <ThemeProvider>
        <DrawingPage params={Promise.resolve({ id: '123' })} />
      </ThemeProvider>
    );

    await waitFor(() => screen.getByText('DWG-001'));

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    // Fetch should only have been called once for the getDrawing
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('shows download button for previewable image files (PNG)', async () => {
    const imageDrawing = { ...mockDrawing, fileUrl: 'http://minio:9000/bucket/file.png' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => imageDrawing,
    });

    render(
      <ThemeProvider>
        <DrawingPage params={Promise.resolve({ id: '123' })} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('DWG-001')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText('Download').closest('button');
    expect(downloadBtn).toBeInTheDocument();
  });

  it('shows download button for non-previewable files (TIFF)', async () => {
    const tiffDrawing = { ...mockDrawing, fileUrl: 'http://minio:9000/bucket/file.tiff' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => tiffDrawing,
    });

    render(
      <ThemeProvider>
        <DrawingPage params={Promise.resolve({ id: '123' })} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('DWG-001')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText('DOWNLOAD FILE').closest('button');
    expect(downloadBtn).toBeInTheDocument();
  });

  it('does not show download button for PDF files', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDrawing, // fileUrl is .pdf
    });

    render(
      <ThemeProvider>
        <DrawingPage params={Promise.resolve({ id: '123' })} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('DWG-001')).toBeInTheDocument();
    });

    expect(screen.queryByText('Download')).not.toBeInTheDocument();
    expect(screen.queryByText('DOWNLOAD FILE')).not.toBeInTheDocument();
  });

  it('handles delete success', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // getDrawing
        ok: true,
        json: async () => mockDrawing,
      })
      .mockResolvedValueOnce({ // DELETE
        ok: true,
        json: async () => ({}),
      });

    (window.confirm as jest.Mock).mockReturnValue(true);

    render(
      <ThemeProvider>
        <DrawingPage params={Promise.resolve({ id: '123' })} />
      </ThemeProvider>
    );

    await waitFor(() => screen.getByText('DWG-001'));

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/drawings/123'),
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
