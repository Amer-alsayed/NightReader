import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PdfViewer from './PdfViewer';

// Mock pdfjs-dist
vi.mock('pdfjs-dist/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 5,
      getPage: vi.fn(() => Promise.resolve({
        getViewport: vi.fn(() => ({ width: 600, height: 800 })),
        render: vi.fn(() => ({
          promise: Promise.resolve(),
          cancel: vi.fn(),
        })),
      })),
      destroy: vi.fn(),
    }),
  })),
}));

vi.mock('pdfjs-dist/build/pdf.worker.mjs', () => ({}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  ZoomIn: () => <span data-testid="zoom-in" />,
  ZoomOut: () => <span data-testid="zoom-out" />,
  Moon: () => <span data-testid="moon" />,
  Sun: () => <span data-testid="sun" />,
  X: () => <span data-testid="x" />,
  Maximize: () => <span data-testid="maximize" />,
  Minimize: () => <span data-testid="minimize" />,
  Maximize2: () => <span data-testid="maximize2" />,
  Eye: () => <span data-testid="eye" />,
  EyeOff: () => <span data-testid="eye-off" />,
  PanelLeft: () => <span data-testid="panel-left" />,
  Scroll: () => <span data-testid="scroll" />,
  BookOpen: () => <span data-testid="book-open" />,
}));

describe('PdfViewer Zoom Constraints', () => {
  const mockFile = new Blob(['dummy pdf content'], { type: 'application/pdf' });
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default scale (150%)', async () => {
    await act(async () => {
      render(<PdfViewer file={mockFile} onClose={onCloseMock} />);
    });
    // Wait for PDF to load
    await waitFor(() => expect(screen.getByText('150%')).toBeInTheDocument());
  });

  it('respects maximum zoom limit (3.0)', async () => {
    await act(async () => {
      render(<PdfViewer file={mockFile} onClose={onCloseMock} />);
    });

    // Wait for PDF to load and initial scale
    await waitFor(() => expect(screen.getByText('150%')).toBeInTheDocument());

    const zoomInBtn = screen.getByTestId('zoom-in').closest('button');

    // Zoom in from 1.5 to 1.75
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('175%')).toBeInTheDocument();

    // Zoom in to 3.0
    // 1.75 -> 2.0 -> 2.25 -> 2.5 -> 2.75 -> 3.0
    fireEvent.click(zoomInBtn); // 2.0
    fireEvent.click(zoomInBtn); // 2.25
    fireEvent.click(zoomInBtn); // 2.5
    fireEvent.click(zoomInBtn); // 2.75
    fireEvent.click(zoomInBtn); // 3.0

    expect(screen.getByText('300%')).toBeInTheDocument();

    // Verify button is disabled
    expect(zoomInBtn).toBeDisabled();

    // Try to zoom in again (should not change)
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('300%')).toBeInTheDocument();
  });

  it('respects minimum zoom limit (0.5)', async () => {
    await act(async () => {
      render(<PdfViewer file={mockFile} onClose={onCloseMock} />);
    });

    // Wait for PDF to load and initial scale
    await waitFor(() => expect(screen.getByText('150%')).toBeInTheDocument());

    const zoomOutBtn = screen.getByTestId('zoom-out').closest('button');

    // Zoom out from 1.5 to 1.25
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('125%')).toBeInTheDocument();

    // Zoom out to 0.5
    // 1.25 -> 1.0 -> 0.75 -> 0.5
    fireEvent.click(zoomOutBtn); // 1.0
    fireEvent.click(zoomOutBtn); // 0.75
    fireEvent.click(zoomOutBtn); // 0.5

    expect(screen.getByText('50%')).toBeInTheDocument();

    // Verify button is disabled
    expect(zoomOutBtn).toBeDisabled();

    // Try to zoom out again (should not change)
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('changes fitMode to custom when zooming', async () => {
    await act(async () => {
      render(<PdfViewer file={mockFile} onClose={onCloseMock} />);
    });

    // Wait for PDF to load
    await waitFor(() => expect(screen.getByText('150%')).toBeInTheDocument());

    const zoomInBtn = screen.getByTestId('zoom-in').closest('button');
    // The Maximize2 icon is used for the cycleFitMode button
    const fitModeBtn = screen.getByTestId('maximize2').closest('button');

    // Initial fit mode is 'page'
    expect(fitModeBtn).toHaveAttribute('title', 'Fit Mode: page');

    // Zoom in
    fireEvent.click(zoomInBtn);

    // Verify fit mode changed to custom
    expect(fitModeBtn).toHaveAttribute('title', 'Fit Mode: custom');
  });
});
