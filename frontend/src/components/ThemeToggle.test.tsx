import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../context/ThemeContext';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage and reset data-theme
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders correctly', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );
    });
    expect(screen.getByRole('button', { name: /Toggle Theme/i })).toBeInTheDocument();
  });

  it('toggles theme on click', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );
    });

    const button = screen.getByRole('button', { name: /Toggle Theme/i });

    // Initially dark (default)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Click to toggle
    await act(async () => {
      fireEvent.click(button);
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click to toggle back
    await act(async () => {
      fireEvent.click(button);
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
