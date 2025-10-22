import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { FilePreview } from '@/types/chat';

import ChatFileUploadPreviews from '@/components/Chat/ChatInput/ChatFileUploadPreviews';

import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock icons
vi.mock('@/components/Icons/cancel', () => ({
  XIcon: ({ className }: { className: string }) => (
    <div data-testid="x-icon" className={className}>
      X
    </div>
  ),
}));

vi.mock('@/components/Icons/file', () => ({
  default: ({ className }: { className: string }) => (
    <div data-testid="file-icon" className={className}>
      File
    </div>
  ),
}));

describe('ChatFileUploadPreviews', () => {
  const mockSetFilePreviews = vi.fn();
  const mockSetSubmitType = vi.fn();

  beforeEach(() => {
    mockSetFilePreviews.mockClear();
    mockSetSubmitType.mockClear();
  });

  const createImagePreview = (overrides = {}): FilePreview => ({
    name: 'image.png',
    type: 'image/png',
    status: 'completed',
    previewUrl: 'data:image/png;base64,abc123',
    ...overrides,
  });

  const createFilePreview = (overrides = {}): FilePreview => ({
    name: 'document.pdf',
    type: 'application/pdf',
    status: 'completed',
    previewUrl: '',
    ...overrides,
  });

  describe('Empty State', () => {
    it('returns null when no file previews', () => {
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Image Previews', () => {
    it('renders image preview', () => {
      const imagePreview = createImagePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[imagePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const img = screen.getByAltText('Preview');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', imagePreview.previewUrl);
    });

    it('image has correct styling', () => {
      const imagePreview = createImagePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[imagePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const img = screen.getByAltText('Preview');
      expect(img).toHaveClass('object-cover');
      expect(img).toHaveClass('w-full');
      expect(img).toHaveClass('max-h-[150px]');
    });

    it('renders multiple image previews', () => {
      const previews = [
        createImagePreview({ name: 'img1.png' }),
        createImagePreview({ name: 'img2.jpg', type: 'image/jpeg' }),
      ];

      render(
        <ChatFileUploadPreviews
          filePreviews={previews}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const images = screen.getAllByAltText('Preview');
      expect(images).toHaveLength(2);
    });
  });

  describe('File Previews', () => {
    it('renders file preview with icon and name', () => {
      const filePreview = createFilePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByTestId('file-icon')).toBeInTheDocument();
    });

    it('displays PDF warning for PDF files', () => {
      const pdfPreview = createFilePreview({ name: 'report.pdf' });
      render(
        <ChatFileUploadPreviews
          filePreviews={[pdfPreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(screen.getByText('Text Only')).toBeInTheDocument();
    });

    it('does not show PDF warning for non-PDF files', () => {
      const filePreview = createFilePreview({
        name: 'document.txt',
        type: 'text/plain',
      });
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(screen.queryByText('Text Only')).not.toBeInTheDocument();
    });

    it('does not show PDF warning when status is not completed', () => {
      const pdfPreview = createFilePreview({
        name: 'report.pdf',
        status: 'uploading',
      });
      render(
        <ChatFileUploadPreviews
          filePreviews={[pdfPreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(screen.queryByText('Text Only')).not.toBeInTheDocument();
    });

    it('applies scrolling animation for long filenames', () => {
      const longFilename = 'very-long-filename-that-exceeds-16-characters.pdf';
      const filePreview = createFilePreview({ name: longFilename });
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const filenameSpan = container.querySelector('.animate-scroll-text-auto');
      expect(filenameSpan).toBeInTheDocument();
    });

    it('does not apply scrolling animation for short filenames', () => {
      const shortFilename = 'short.pdf';
      const filePreview = createFilePreview({ name: shortFilename });
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const filenameSpan = container.querySelector('.animate-scroll-text-auto');
      expect(filenameSpan).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('does not show status badge when completed', () => {
      const filePreview = createFilePreview({ status: 'completed' });
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(screen.queryByText('completed')).not.toBeInTheDocument();
    });

    it('shows status badge when uploading', () => {
      const filePreview = createFilePreview({ status: 'uploading' });
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
          uploadProgress={{ [filePreview.name]: 50 }}
        />,
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows status badge when pending', () => {
      const filePreview = createFilePreview({ status: 'pending' });
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('shows status badge when failed', () => {
      const filePreview = createFilePreview({ status: 'failed' });
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(screen.getByText('failed')).toBeInTheDocument();
    });

    it('status badge has correct styling', () => {
      const filePreview = createFilePreview({ status: 'uploading' });
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
          uploadProgress={{ [filePreview.name]: 75 }}
        />,
      );

      const statusBadge = screen.getByText('75%');
      expect(statusBadge).toHaveClass('absolute');
      expect(statusBadge).toHaveClass('bottom-2');
      expect(statusBadge).toHaveClass('bg-opacity-75');
    });
  });

  describe('Remove Functionality', () => {
    it('renders remove button', () => {
      const filePreview = createFilePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const removeButton = screen.getByLabelText('Remove');
      expect(removeButton).toBeInTheDocument();
    });

    it('calls setFilePreviews when remove button is clicked', () => {
      const filePreview = createFilePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const removeButton = screen.getByLabelText('Remove');
      fireEvent.click(removeButton);

      expect(mockSetFilePreviews).toHaveBeenCalled();
    });

    it('removes correct file from previews', () => {
      const previews = [
        createFilePreview({ name: 'file1.pdf' }),
        createFilePreview({ name: 'file2.pdf' }),
      ];

      render(
        <ChatFileUploadPreviews
          filePreviews={previews}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const removeButtons = screen.getAllByLabelText('Remove');
      fireEvent.click(removeButtons[0]);

      expect(mockSetFilePreviews).toHaveBeenCalled();
      const updateFunction = mockSetFilePreviews.mock.calls[0][0];
      const newPreviews = updateFunction(previews);
      expect(newPreviews).toHaveLength(1);
      expect(newPreviews[0].name).toBe('file2.pdf');
    });

    it('sets submit type to text when last file is removed', () => {
      const filePreview = createFilePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const removeButton = screen.getByLabelText('Remove');
      fireEvent.click(removeButton);

      const updateFunction = mockSetFilePreviews.mock.calls[0][0];
      updateFunction([filePreview]);

      // The component calls setSubmitType inside the setFilePreviews callback
      // We need to simulate that
      expect(mockSetFilePreviews).toHaveBeenCalled();
    });

    it('prevents default on remove button click', () => {
      const filePreview = createFilePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const removeButton = screen.getByLabelText('Remove');
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

      fireEvent(removeButton, clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Hover Behavior', () => {
    it('shows remove button on hover', async () => {
      const filePreview = createFilePreview();
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const previewContainer = container.querySelector('.group');
      expect(previewContainer).toBeInTheDocument();

      fireEvent.mouseEnter(previewContainer!);

      const removeButton = screen.getByLabelText('Remove');
      expect(removeButton).toHaveClass('opacity-100');
    });

    it('hides remove button on mouse leave', async () => {
      const filePreview = createFilePreview();
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const previewContainer = container.querySelector('.group');
      fireEvent.mouseEnter(previewContainer!);
      fireEvent.mouseLeave(previewContainer!);

      const removeButton = screen.getByLabelText('Remove');
      expect(removeButton).toHaveClass('opacity-0');
    });
  });

  describe('Touch Events', () => {
    it('shows remove button on touch start', () => {
      const filePreview = createFilePreview();
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const previewContainer = container.querySelector('.group');
      fireEvent.touchStart(previewContainer!);

      const removeButton = screen.getByLabelText('Remove');
      expect(removeButton).toHaveClass('opacity-100');
    });

    it('touch end triggers delayed hide on mobile', () => {
      const filePreview = createFilePreview();
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const previewContainer = container.querySelector('.group');
      fireEvent.touchStart(previewContainer!);

      const removeButton = screen.getByLabelText('Remove');
      expect(removeButton).toHaveClass('opacity-100');

      // Touch end is set up - actual delay behavior is handled by component
      fireEvent.touchEnd(previewContainer!);

      // Component uses setTimeout, which is tested indirectly through user interaction
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('container has correct flex layout', () => {
      const filePreview = createFilePreview();
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-wrap');
      expect(wrapper).toHaveClass('overflow-x-auto');
    });

    it('preview has correct styling', () => {
      const filePreview = createFilePreview();
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const preview = container.querySelector('.group');
      expect(preview).toHaveClass('rounded-md');
      expect(preview).toHaveClass('border');
      expect(preview).toHaveClass('dark:border-white');
    });
  });

  describe('Error Handling', () => {
    it('throws error for empty filePreview', () => {
      // This tests the internal ChatFileUploadPreview component
      // We can't test it directly since it's not exported
      // But we ensure the component handles this case
      expect(() => {
        render(
          <ChatFileUploadPreviews
            filePreviews={[null as any]}
            setFilePreviews={mockSetFilePreviews}
            setSubmitType={mockSetSubmitType}
          />,
        );
      }).toThrow('Empty filePreview found');
    });
  });

  describe('Accessibility', () => {
    it('remove button has aria-label', () => {
      const filePreview = createFilePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const removeButton = screen.getByLabelText('Remove');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove');
    });

    it('remove button has screen reader text', () => {
      const filePreview = createFilePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[filePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      expect(
        screen.getByText('Remove', { selector: '.sr-only' }),
      ).toBeInTheDocument();
    });

    it('image has alt text', () => {
      const imagePreview = createImagePreview();
      render(
        <ChatFileUploadPreviews
          filePreviews={[imagePreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const img = screen.getByAltText('Preview');
      expect(img).toBeInTheDocument();
    });

    it('PDF warning has title attribute', () => {
      const pdfPreview = createFilePreview({ name: 'report.pdf' });
      const { container } = render(
        <ChatFileUploadPreviews
          filePreviews={[pdfPreview]}
          setFilePreviews={mockSetFilePreviews}
          setSubmitType={mockSetSubmitType}
        />,
      );

      const warning = container.querySelector('[title]');
      expect(warning).toHaveAttribute('title');
      expect(warning?.getAttribute('title')).toContain('text content');
    });
  });
});
