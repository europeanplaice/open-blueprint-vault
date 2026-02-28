import { render, screen, fireEvent } from '@testing-library/react';
import { DrawingRow } from './DrawingRow';
import { Drawing } from '../types/drawing';

const mockDrawing: Drawing = {
  id: 'test-id',
  drawingNumber: 'DWG-123',
  name: 'Test Part',
  createdAt: '2023-01-01T00:00:00.000Z',
  fileUrl: 'http://example.com/file.pdf',
  status: 'PENDING',
};

const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

describe('DrawingRow', () => {
  it('renders drawing information correctly', () => {
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={mockDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('DWG-123')).toBeInTheDocument();
    expect(screen.getByText('Test Part')).toBeInTheDocument();
    expect(screen.getByText('VIEW')).toHaveAttribute('href', '/drawings/test-id');
  });

  it('renders PROCESSING status correctly', () => {
    const processingDrawing = { ...mockDrawing, status: 'PROCESSING' };
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={processingDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders COMPLETED status correctly', () => {
    const completedDrawing = { ...mockDrawing, status: 'COMPLETED' };
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={completedDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders FAILED status correctly', () => {
    const failedDrawing = { ...mockDrawing, status: 'FAILED' };
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={failedDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders revision correctly', () => {
    const revisionDrawing = { ...mockDrawing, revision: 'Rev.A' };
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={revisionDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('Rev.A')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={mockDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const deleteButton = screen.getByRole('button', { name: /del/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockDrawing);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={mockDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockDrawing);
  });

  it('handles hover state', () => {
    render(
      <table>
        <tbody>
          <DrawingRow
            drawing={mockDrawing}
            index={0}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const row = screen.getByTestId('drawing-row');
    fireEvent.mouseEnter(row);
    expect(row).toHaveStyle('background: var(--bg-elevated)');

    fireEvent.mouseLeave(row);
    expect(row).toHaveStyle('background: transparent');
  });
});
