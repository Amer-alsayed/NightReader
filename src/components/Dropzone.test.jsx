import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dropzone from './Dropzone';

describe('Dropzone Component', () => {
  it('renders correctly', () => {
    render(<Dropzone onFileSelect={() => {}} />);
    expect(screen.getByText(/Drag & Drop your PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse files/i)).toBeInTheDocument();
  });

  it('handles drag over and drag leave events', () => {
    render(<Dropzone onFileSelect={() => {}} />);
    const dropzone = screen.getByText(/Drag & Drop your PDF/i).closest('.dropzone-area');

    fireEvent.dragOver(dropzone);
    expect(dropzone).toHaveClass('dragging');
    expect(screen.getByText(/Drop it here!/i)).toBeInTheDocument();

    fireEvent.dragLeave(dropzone);
    expect(dropzone).not.toHaveClass('dragging');
    expect(screen.getByText(/Drag & Drop your PDF/i)).toBeInTheDocument();
  });

  it('calls onFileSelect when a valid PDF file is dropped', () => {
    const onFileSelectMock = vi.fn();
    render(<Dropzone onFileSelect={onFileSelectMock} />);
    const dropzone = screen.getByText(/Drag & Drop your PDF/i).closest('.dropzone-area');

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const dataTransfer = {
      files: [file],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    expect(onFileSelectMock).toHaveBeenCalledTimes(1);
    expect(onFileSelectMock).toHaveBeenCalledWith(file);
  });

  it('shows an alert when a non-PDF file is dropped', () => {
    const onFileSelectMock = vi.fn();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Dropzone onFileSelect={onFileSelectMock} />);
    const dropzone = screen.getByText(/Drag & Drop your PDF/i).closest('.dropzone-area');

    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    const dataTransfer = {
      files: [file],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    expect(onFileSelectMock).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('Please drop a valid PDF file.');
    alertMock.mockRestore();
  });

  it('calls onFileSelect when a file is selected via input', () => {
    const onFileSelectMock = vi.fn();
    render(<Dropzone onFileSelect={onFileSelectMock} />);
    const input = document.getElementById('file-upload'); // Since it's hidden, we might need to select by ID or label

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelectMock).toHaveBeenCalledTimes(1);
    expect(onFileSelectMock).toHaveBeenCalledWith(file);
  });
});
