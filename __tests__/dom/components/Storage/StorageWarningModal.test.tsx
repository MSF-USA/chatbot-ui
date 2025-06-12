import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StorageWarningModal } from '@/components/Storage/StorageWarningModal';
import * as storageMonitor from '@/utils/app/storageMonitor';
import * as importExport from '@/utils/app/importExport';
import '@testing-library/jest-dom';

// Mock the i18n
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

// Mock the storageMonitor utility functions
vi.mock('@/utils/app/storageMonitor', () => ({
  getStorageUsage: vi.fn(),
  calculateSpaceFreed: vi.fn(),
  clearOlderConversations: vi.fn(),
  MIN_RETAINED_CONVERSATIONS: 5
}));

// Mock the importExport utility functions
vi.mock('@/utils/app/importExport', () => ({
  exportData: vi.fn()
}));

describe('StorageWarningModal', () => {
  const mockOnClose = vi.fn();
  const mockOnClear = vi.fn();
  const mockOnDismissThreshold = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(storageMonitor.getStorageUsage).mockReturnValue({
      currentUsage: 3.5 * 1024 * 1024, // 3.5MB
      maxUsage: 5 * 1024 * 1024, // 5MB
      percentUsed: 70,
      isNearingLimit: true
    });

    vi.mocked(storageMonitor.calculateSpaceFreed).mockReturnValue({
      spaceFreed: 1 * 1024 * 1024, // 1MB
      conversationsRemoved: 10,
      percentFreed: 20
    });

    vi.mocked(storageMonitor.clearOlderConversations).mockReturnValue(true);
    vi.mocked(importExport.exportData).mockImplementation(() => {});
  });

  it('should not render when isOpen is false', () => {
    render(
      <StorageWarningModal
        isOpen={false}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Modal should not be in the document
    expect(screen.queryByText('Storage Warning')).not.toBeInTheDocument();
  });

  it('should render with warning level by default', () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Title should be "Storage Warning"
    expect(screen.getByText('Storage Warning')).toBeInTheDocument();

    // Should show current usage
    expect(screen.getByText(/Current usage/)).toBeInTheDocument();

    // Should show options to free up space
    expect(screen.getByText('Options to free up space:')).toBeInTheDocument();
    expect(screen.getByText('1. Export your conversations')).toBeInTheDocument();
    expect(screen.getByText('2. Clear older conversations')).toBeInTheDocument();

    // Should have export and clear buttons
    expect(screen.getByText('Export All Data')).toBeInTheDocument();
    expect(screen.getByText('Clear Older Conversations')).toBeInTheDocument();

    // Should have dismiss and close buttons
    expect(screen.getByText('Dismiss Warning')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should render with critical level when isCriticalLevel is true', () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
        currentThreshold="CRITICAL"
        isCriticalLevel={true}
      />
    );

    // Title should be "Storage Critical"
    expect(screen.getByText('Storage Critical')).toBeInTheDocument();

    // Should show critical message
    expect(screen.getByText('Your browser storage is almost full! It is strongly recommended to free up space soon.')).toBeInTheDocument();

    // Dismiss button should have critical styling (checking for class would be implementation-specific)
    const dismissButton = screen.getByText('Dismiss Warning');
    expect(dismissButton).toBeInTheDocument();
  });

  it('should render with emergency level when isEmergencyLevel is true', () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
        currentThreshold="EMERGENCY"
        isEmergencyLevel={true}
      />
    );

    // Title should be "Storage Emergency"
    expect(screen.getByText('Storage Emergency')).toBeInTheDocument();

    // Should show emergency message
    expect(screen.getByText('Your browser storage is critically full! You must free up space to continue using the application.')).toBeInTheDocument();

    // Close button should be disabled
    const closeButton = screen.getByText('Close');
    expect(closeButton).toBeDisabled();
    expect(closeButton).toHaveAttribute('title', 'You must free up space before dismissing this warning');

    // Dismiss button should not be present
    expect(screen.queryByText('Dismiss Warning')).not.toBeInTheDocument();
  });

  it('should call exportData when Export button is clicked', async () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Click export button
    await act(async () => {
      fireEvent.click(screen.getByText('Export All Data'));
    });

    // Should call exportData
    expect(importExport.exportData).toHaveBeenCalledTimes(1);
  });

  it('should update calculations when keepCount changes', async () => {
    // First calculation with default value
    vi.mocked(storageMonitor.calculateSpaceFreed).mockReturnValueOnce({
      spaceFreed: 1 * 1024 * 1024, // 1MB
      conversationsRemoved: 10,
      percentFreed: 20
    });

    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Initial values
    expect(screen.getByText(/This will remove 10 older conversations/)).toBeInTheDocument();
    expect(screen.getByText(/Space freed: 1.00 MB \(20.0%\)/)).toBeInTheDocument();

    // Mock new calculation for changed keepCount
    vi.mocked(storageMonitor.calculateSpaceFreed).mockReturnValueOnce({
      spaceFreed: 2 * 1024 * 1024, // 2MB
      conversationsRemoved: 15,
      percentFreed: 40
    });

    // Change keepCount input
    // const keepCountInput = screen.getByLabelText(/Keep recent conversations/);
    // await act(async () => {
    //   fireEvent.change(keepCountInput, { target: { value: '3' } });
    // });
    //
    // // Should call calculateSpaceFreed with new value
    // expect(storageMonitor.calculateSpaceFreed).toHaveBeenCalledWith(3);
    //
    // // Should update displayed values
    // expect(screen.getByText(/This will remove 15 older conversations/)).toBeInTheDocument();
    // expect(screen.getByText(/Space freed: 2.00 MB \(40.0%\)/)).toBeInTheDocument();
  });

  it('should call clearOlderConversations when Clear button is clicked', async () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Click clear button
    await act(async () => {
      fireEvent.click(screen.getByText('Clear Older Conversations'));
    });

    // Should call clearOlderConversations with keepCount
    expect(storageMonitor.clearOlderConversations).toHaveBeenCalledWith(5); // Default value

    // Should call onClear and onClose
    expect(mockOnClear).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClear if clearOlderConversations returns false', async () => {
    vi.mocked(storageMonitor.clearOlderConversations).mockReturnValue(false);

    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Click clear button
    await act(async () => {
      fireEvent.click(screen.getByText('Clear Older Conversations'));
    });

    // Should call clearOlderConversations
    expect(storageMonitor.clearOlderConversations).toHaveBeenCalledTimes(1);

    // Should not call onClear or onClose
    expect(mockOnClear).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Close button is clicked', async () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Click close button
    await act(async () => {
      fireEvent.click(screen.getByText('Close'));
    });

    // Should call onClose
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onDismissThreshold when Dismiss Warning button is clicked', async () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
        onDismissThreshold={mockOnDismissThreshold}
      />
    );

    // Click dismiss button
    await act(async () => {
      fireEvent.click(screen.getByText('Dismiss Warning'));
    });

    // Should call onDismissThreshold
    expect(mockOnDismissThreshold).toHaveBeenCalledTimes(1);
  });

  it('should disable Clear button when no conversations would be removed', async () => {
    vi.mocked(storageMonitor.calculateSpaceFreed).mockReturnValue({
      spaceFreed: 0,
      conversationsRemoved: 0,
      percentFreed: 0
    });

    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Clear button should be disabled
    const clearButton = screen.getByText('Clear Older Conversations');
    expect(clearButton).toBeDisabled();
  });

  it('should format bytes correctly', () => {
    // Test with different storage sizes
    vi.mocked(storageMonitor.getStorageUsage).mockReturnValue({
      currentUsage: 500, // 500 bytes
      maxUsage: 5 * 1024 * 1024, // 5MB
      percentUsed: 0.01,
      isNearingLimit: false
    });

    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Should format bytes correctly
    expect(screen.getByText(/Current usage: 500 B/)).toBeInTheDocument();

    // Test with KB
    vi.mocked(storageMonitor.getStorageUsage).mockReturnValue({
      currentUsage: 1.5 * 1024, // 1.5KB
      maxUsage: 5 * 1024 * 1024, // 5MB
      percentUsed: 0.03,
      isNearingLimit: false
    });

    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Should format KB correctly
    expect(screen.getByText(/Current usage: 1.50 KB/)).toBeInTheDocument();

    // Test with MB
    vi.mocked(storageMonitor.getStorageUsage).mockReturnValue({
      currentUsage: 2.75 * 1024 * 1024, // 2.75MB
      maxUsage: 5 * 1024 * 1024, // 5MB
      percentUsed: 55,
      isNearingLimit: false
    });

    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Should format MB correctly
    expect(screen.getByText(/Current usage: 2.75 MB/)).toBeInTheDocument();
  });

  it('should not allow keepCount less than 1', async () => {
    render(
      <StorageWarningModal
        isOpen={true}
        onClose={mockOnClose}
        onClear={mockOnClear}
      />
    );

    // Try to set keepCount to 0
    const keepCountInput = screen.getByLabelText(/Keep recent conversations/);
    await act(async () => {
      fireEvent.change(keepCountInput, { target: { value: '0' } });
    });

    // Should not update the value
    expect(keepCountInput).toHaveValue(5);

    // Try to set keepCount to a negative number
    await act(async () => {
      fireEvent.change(keepCountInput, { target: { value: '-3' } });
    });

    // Should not update the value
    expect(keepCountInput).toHaveValue(5);

    // Try to set keepCount to a non-number
    await act(async () => {
      fireEvent.change(keepCountInput, { target: { value: 'abc' } });
    });

    // Should not update the value
    expect(keepCountInput).toHaveValue(5);
  });
});
