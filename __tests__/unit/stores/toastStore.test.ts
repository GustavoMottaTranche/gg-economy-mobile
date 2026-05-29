/**
 * Unit tests for toast store
 *
 * **Validates: Requirements 35, 26, 29**
 */

import { act, renderHook } from '@testing-library/react-native';
import { useToastStore, useToastActions, useToasts } from '../../../src/stores/toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useToastStore.getState().reset();
    });
    // Clear any pending timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('showToast', () => {
    it('should add a toast with default values', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({ message: 'Test message' });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]!.message).toBe('Test message');
      expect(result.current.toasts[0]!.severity).toBe('info');
      expect(result.current.toasts[0]!.dismissible).toBe(true);
    });

    it('should add a toast with custom values', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({
          message: 'Error message',
          severity: 'error',
          title: 'Error Title',
          duration: 10000,
          dismissible: false,
        });
      });

      expect(result.current.toasts[0]!.severity).toBe('error');
      expect(result.current.toasts[0]!.title).toBe('Error Title');
      expect(result.current.toasts[0]!.duration).toBe(10000);
      expect(result.current.toasts[0]!.dismissible).toBe(false);
    });

    it('should return a unique toast ID', () => {
      const { result } = renderHook(() => useToastStore());

      let id1: string, id2: string;
      act(() => {
        id1 = result.current.showToast({ message: 'Toast 1' });
        id2 = result.current.showToast({ message: 'Toast 2' });
      });

      expect(id1!).toBeDefined();
      expect(id2!).toBeDefined();
      expect(id1!).not.toBe(id2!);
    });

    it('should auto-dismiss after duration', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({ message: 'Test', duration: 1000 });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not auto-dismiss when duration is 0', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({ message: 'Test', duration: 0 });
      });

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('should limit toasts to maxToasts', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.setMaxToasts(2);
        result.current.showToast({ message: 'Toast 1', duration: 0 });
        result.current.showToast({ message: 'Toast 2', duration: 0 });
        result.current.showToast({ message: 'Toast 3', duration: 0 });
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0]!.message).toBe('Toast 2');
      expect(result.current.toasts[1]!.message).toBe('Toast 3');
    });

    it('should include action in toast', () => {
      const { result } = renderHook(() => useToastStore());
      const onPress = jest.fn();

      act(() => {
        result.current.showToast({
          message: 'Test',
          action: { label: 'Retry', onPress },
        });
      });

      expect(result.current.toasts[0]!.action).toBeDefined();
      expect(result.current.toasts[0]!.action?.label).toBe('Retry');
    });

    it('should include params for i18n interpolation', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({
          message: 'errors.parseErrorLine',
          params: { line: 42, message: 'Invalid date' },
        });
      });

      expect(result.current.toasts[0]!.params).toEqual({
        line: 42,
        message: 'Invalid date',
      });
    });
  });

  describe('showError', () => {
    it('should show an error toast', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showError('Error message');
      });

      expect(result.current.toasts[0]!.severity).toBe('error');
      expect(result.current.toasts[0]!.message).toBe('Error message');
    });

    it('should use longer duration for errors', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showError('Error');
      });

      expect(result.current.toasts[0]!.duration).toBe(6000);
    });
  });

  describe('showWarning', () => {
    it('should show a warning toast', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showWarning('Warning message');
      });

      expect(result.current.toasts[0]!.severity).toBe('warning');
    });
  });

  describe('showInfo', () => {
    it('should show an info toast', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showInfo('Info message');
      });

      expect(result.current.toasts[0]!.severity).toBe('info');
    });
  });

  describe('showSuccess', () => {
    it('should show a success toast', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showSuccess('Success message');
      });

      expect(result.current.toasts[0]!.severity).toBe('success');
    });

    it('should use shorter duration for success', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showSuccess('Success');
      });

      expect(result.current.toasts[0]!.duration).toBe(3000);
    });
  });

  describe('dismissToast', () => {
    it('should remove a specific toast by ID', () => {
      const { result } = renderHook(() => useToastStore());

      let id: string;
      act(() => {
        id = result.current.showToast({ message: 'Toast 1', duration: 0 });
        result.current.showToast({ message: 'Toast 2', duration: 0 });
      });

      act(() => {
        result.current.dismissToast(id!);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]!.message).toBe('Toast 2');
    });

    it('should do nothing if ID does not exist', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({ message: 'Toast', duration: 0 });
      });

      act(() => {
        result.current.dismissToast('non-existent-id');
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('dismissAllToasts', () => {
    it('should remove all toasts', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({ message: 'Toast 1', duration: 0 });
        result.current.showToast({ message: 'Toast 2', duration: 0 });
        result.current.showToast({ message: 'Toast 3', duration: 0 });
      });

      act(() => {
        result.current.dismissAllToasts();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('setMaxToasts', () => {
    it('should update max toasts and trim existing', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({ message: 'Toast 1', duration: 0 });
        result.current.showToast({ message: 'Toast 2', duration: 0 });
        result.current.showToast({ message: 'Toast 3', duration: 0 });
      });

      act(() => {
        result.current.setMaxToasts(1);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.maxToasts).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.showToast({ message: 'Toast', duration: 0 });
        result.current.setMaxToasts(10);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.toasts).toHaveLength(0);
      expect(result.current.maxToasts).toBe(3);
    });
  });

  describe('useToastActions hook', () => {
    it('should return toast action functions', () => {
      const { result } = renderHook(() => useToastActions());

      expect(result.current.showToast).toBeDefined();
      expect(result.current.showError).toBeDefined();
      expect(result.current.showWarning).toBeDefined();
      expect(result.current.showInfo).toBeDefined();
      expect(result.current.showSuccess).toBeDefined();
      expect(result.current.dismissToast).toBeDefined();
      expect(result.current.dismissAllToasts).toBeDefined();
    });
  });

  describe('useToasts hook', () => {
    it('should return current toasts', () => {
      const { result: storeResult } = renderHook(() => useToastStore());
      const { result: toastsResult } = renderHook(() => useToasts());

      act(() => {
        storeResult.current.showToast({ message: 'Test', duration: 0 });
      });

      expect(toastsResult.current).toHaveLength(1);
      expect(toastsResult.current[0]!.message).toBe('Test');
    });
  });
});
