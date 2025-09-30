import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import * as storageMonitor from '@/utils/app/storageMonitor';

import {
  StorageMonitorProvider,
  useStorageMonitor,
} from '@/contexts/StorageMonitorContext';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the storageMonitor utility functions
vi.mock('@/utils/app/storageMonitor', () => ({
  updateStorageStats: vi.fn(),
  dismissThreshold: vi.fn(),
  resetDismissedThresholds: vi.fn(),
  STORAGE_THRESHOLDS: {
    WARNING: 70,
    CRITICAL: 85,
    EMERGENCY: 95,
  },
}));

// Test component that uses the context
const TestConsumer = () => {
  const {
    isNearingLimit,
    storagePercentage,
    currentThreshold,
    checkStorage,
    showStorageWarning,
    setShowStorageWarning,
    dismissCurrentThreshold,
    resetDismissedThresholds,
    isEmergencyLevel,
    isCriticalLevel,
  } = useStorageMonitor();

  return (
    <div>
      <div data-testid="isNearingLimit">{isNearingLimit.toString()}</div>
      <div data-testid="storagePercentage">{storagePercentage}</div>
      <div data-testid="currentThreshold">{currentThreshold || 'null'}</div>
      <div data-testid="showStorageWarning">
        {showStorageWarning.toString()}
      </div>
      <div data-testid="isEmergencyLevel">{isEmergencyLevel.toString()}</div>
      <div data-testid="isCriticalLevel">{isCriticalLevel.toString()}</div>
      <button data-testid="checkStorage" onClick={checkStorage}>
        Check Storage
      </button>
      <button
        data-testid="setShowWarningTrue"
        onClick={() => setShowStorageWarning(true)}
      >
        Show Warning
      </button>
      <button
        data-testid="setShowWarningFalse"
        onClick={() => setShowStorageWarning(false)}
      >
        Hide Warning
      </button>
      <button data-testid="dismissThreshold" onClick={dismissCurrentThreshold}>
        Dismiss Threshold
      </button>
      <button data-testid="resetThresholds" onClick={resetDismissedThresholds}>
        Reset Thresholds
      </button>
    </div>
  );
};

describe('StorageMonitorContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(storageMonitor.updateStorageStats).mockReturnValue({
      isNearingLimit: false,
      usageData: {
        currentUsage: 1000,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 0.1,
        isNearingLimit: false,
      },
      currentThreshold: null,
      shouldShowWarning: false,
    });
  });

  it('should render children and provide default context values', async () => {
    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    expect(screen.getByTestId('isNearingLimit')).toHaveTextContent('false');
    expect(screen.getByTestId('storagePercentage')).toHaveTextContent('0');
    expect(screen.getByTestId('currentThreshold')).toHaveTextContent('null');
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('false');
    expect(screen.getByTestId('isEmergencyLevel')).toHaveTextContent('false');
    expect(screen.getByTestId('isCriticalLevel')).toHaveTextContent('false');
  });

  it('should check storage on initial load', async () => {
    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    expect(storageMonitor.updateStorageStats).toHaveBeenCalledTimes(1);
  });

  it('should update context values when storage is checked', async () => {
    // Mock storage stats with warning level
    vi.mocked(storageMonitor.updateStorageStats).mockReturnValue({
      isNearingLimit: true,
      usageData: {
        currentUsage: 3.5 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 70,
        isNearingLimit: true,
      },
      currentThreshold: 'WARNING',
      shouldShowWarning: true,
    });

    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    expect(screen.getByTestId('isNearingLimit')).toHaveTextContent('true');
    expect(screen.getByTestId('storagePercentage')).toHaveTextContent('70');
    expect(screen.getByTestId('currentThreshold')).toHaveTextContent('WARNING');
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('true');
    expect(screen.getByTestId('isEmergencyLevel')).toHaveTextContent('false');
    expect(screen.getByTestId('isCriticalLevel')).toHaveTextContent('false');
  });

  it('should update context values when checkStorage is called', async () => {
    // Initial render with default values
    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    // Update mock to return critical level
    vi.mocked(storageMonitor.updateStorageStats).mockReturnValue({
      isNearingLimit: true,
      usageData: {
        currentUsage: 4.3 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 86,
        isNearingLimit: true,
      },
      currentThreshold: 'CRITICAL',
      shouldShowWarning: true,
    });

    // Trigger checkStorage
    await act(async () => {
      screen.getByTestId('checkStorage').click();
    });

    expect(screen.getByTestId('isNearingLimit')).toHaveTextContent('true');
    expect(screen.getByTestId('storagePercentage')).toHaveTextContent('86');
    expect(screen.getByTestId('currentThreshold')).toHaveTextContent(
      'CRITICAL',
    );
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('true');
    expect(screen.getByTestId('isEmergencyLevel')).toHaveTextContent('false');
    expect(screen.getByTestId('isCriticalLevel')).toHaveTextContent('true');
  });

  it('should set showStorageWarning when setShowStorageWarning is called', async () => {
    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    // Initially false
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('false');

    // Set to true
    await act(async () => {
      screen.getByTestId('setShowWarningTrue').click();
    });

    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('true');

    // Set to false
    await act(async () => {
      screen.getByTestId('setShowWarningFalse').click();
    });

    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('false');
  });

  it('should call dismissThreshold when dismissCurrentThreshold is called', async () => {
    // Mock storage stats with warning level
    vi.mocked(storageMonitor.updateStorageStats).mockReturnValue({
      isNearingLimit: true,
      usageData: {
        currentUsage: 3.5 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 70,
        isNearingLimit: true,
      },
      currentThreshold: 'WARNING',
      shouldShowWarning: true,
    });

    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    // Initially warning is shown
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('true');

    // Dismiss threshold
    await act(async () => {
      screen.getByTestId('dismissThreshold').click();
    });

    // Should call dismissThreshold with the current threshold
    expect(storageMonitor.dismissThreshold).toHaveBeenCalledWith('WARNING');

    // Should hide the warning
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('false');
  });

  it('should not hide warning for EMERGENCY level when dismissed', async () => {
    // Mock storage stats with emergency level
    vi.mocked(storageMonitor.updateStorageStats).mockReturnValue({
      isNearingLimit: true,
      usageData: {
        currentUsage: 4.8 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 96,
        isNearingLimit: true,
      },
      currentThreshold: 'EMERGENCY',
      shouldShowWarning: true,
    });

    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    // Initially warning is shown
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('true');
    expect(screen.getByTestId('isEmergencyLevel')).toHaveTextContent('true');

    // Dismiss threshold
    await act(async () => {
      screen.getByTestId('dismissThreshold').click();
    });

    // Should call dismissThreshold with the current threshold
    expect(storageMonitor.dismissThreshold).toHaveBeenCalledWith('EMERGENCY');

    // Should NOT hide the warning for emergency level
    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('false');
  });

  it('should call resetDismissedThresholds when resetThresholds is called', async () => {
    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    // Reset thresholds
    await act(async () => {
      screen.getByTestId('resetThresholds').click();
    });

    // Should call resetDismissedThresholds
    expect(storageMonitor.resetDismissedThresholds).toHaveBeenCalledTimes(1);
  });

  it('should set up an interval to check storage regularly', async () => {
    // Mock setInterval and clearInterval
    const originalSetInterval = global.setInterval;
    const originalClearInterval = global.clearInterval;
    const mockSetInterval = vi.fn().mockReturnValue(123);
    const mockClearInterval = vi.fn();

    // Replace global functions with mocks before rendering
    global.setInterval = mockSetInterval as any;
    global.clearInterval = mockClearInterval as any;

    try {
      await act(async () => {
        const { unmount } = render(
          <StorageMonitorProvider>
            <TestConsumer />
          </StorageMonitorProvider>,
        );

        // Ensure all effects have run
        await waitFor(() => {
          expect(mockSetInterval).toHaveBeenCalledWith(
            expect.any(Function),
            50,
          );
        });

        // Unmount to test cleanup
        unmount();
      });

      // Should clear interval on unmount
      expect(mockClearInterval).toHaveBeenCalledWith(123);
    } finally {
      // Restore original functions
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    }
  });

  it('should update warning visibility when shouldShowWarning changes', async () => {
    // Initial render with warning not shown
    vi.mocked(storageMonitor.updateStorageStats).mockReturnValue({
      isNearingLimit: false,
      usageData: {
        currentUsage: 1000,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 0.1,
        isNearingLimit: false,
      },
      currentThreshold: null,
      shouldShowWarning: false,
    });

    await act(async () => {
      render(
        <StorageMonitorProvider>
          <TestConsumer />
        </StorageMonitorProvider>,
      );
    });

    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('false');

    // Update to show warning
    vi.mocked(storageMonitor.updateStorageStats).mockReturnValue({
      isNearingLimit: true,
      usageData: {
        currentUsage: 3.5 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 70,
        isNearingLimit: true,
      },
      currentThreshold: 'WARNING',
      shouldShowWarning: true,
    });

    // Trigger checkStorage
    await act(async () => {
      screen.getByTestId('checkStorage').click();
    });

    expect(screen.getByTestId('showStorageWarning')).toHaveTextContent('true');
  });
});
