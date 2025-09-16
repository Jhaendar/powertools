/**
 * Unit tests for clipboard helper utility
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { clipboardHelper } from '../clipboardHelper';

// Mock the clipboard API
const mockWriteText = vi.fn();
const mockClipboard = {
  writeText: mockWriteText
};

// Mock document.execCommand
const mockExecCommand = vi.fn();

// Setup mocks
beforeEach(() => {
  vi.clearAllMocks();
  mockWriteText.mockReset();
  mockExecCommand.mockReset();
  
  // Reset navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true
  });
  
  // Mock document.execCommand
  Object.defineProperty(document, 'execCommand', {
    value: mockExecCommand,
    writable: true
  });
  
  // Mock window.isSecureContext
  Object.defineProperty(window, 'isSecureContext', {
    value: true,
    writable: true
  });
});

describe('ClipboardHelper', () => {
  describe('isSupported', () => {
    it('should return true when clipboard API is available and context is secure', () => {
      expect(clipboardHelper.isSupported()).toBe(true);
    });

    it('should return false when clipboard API is not available', () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true
      });
      
      expect(clipboardHelper.isSupported()).toBe(false);
    });

    it('should return false when context is not secure', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        writable: true
      });
      
      expect(clipboardHelper.isSupported()).toBe(false);
    });

    it('should return false when writeText is not available', () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {},
        writable: true
      });
      
      expect(clipboardHelper.isSupported()).toBe(false);
    });
  });

  describe('copy', () => {
    it('should successfully copy text using modern clipboard API', async () => {
      mockWriteText.mockResolvedValue(undefined);
      
      const result = await clipboardHelper.copy('test text');
      
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });

    it('should fall back to execCommand when clipboard API fails', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard API failed'));
      mockExecCommand.mockReturnValue(true);
      
      // Mock DOM methods
      const mockTextarea = {
        value: '',
        style: {},
        setAttribute: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn()
      };
      
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockCreateElement = vi.fn().mockReturnValue(mockTextarea);
      
      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true
      });
      
      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
        writable: true
      });
      
      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
        writable: true
      });
      
      const result = await clipboardHelper.copy('fallback text');
      
      expect(result).toBe(true);
      expect(mockCreateElement).toHaveBeenCalledWith('textarea');
      expect(mockTextarea.value).toBe('fallback text');
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });

    it('should return false when both methods fail', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard API failed'));
      mockExecCommand.mockReturnValue(false);
      
      // Mock DOM methods for fallback
      const mockTextarea = {
        value: '',
        style: {},
        setAttribute: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn()
      };
      
      Object.defineProperty(document, 'createElement', {
        value: vi.fn().mockReturnValue(mockTextarea),
        writable: true
      });
      
      Object.defineProperty(document.body, 'appendChild', {
        value: vi.fn(),
        writable: true
      });
      
      Object.defineProperty(document.body, 'removeChild', {
        value: vi.fn(),
        writable: true
      });
      
      const result = await clipboardHelper.copy('failed text');
      
      expect(result).toBe(false);
    });

    it('should use fallback when clipboard API is not supported', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true
      });
      
      mockExecCommand.mockReturnValue(true);
      
      // Mock DOM methods
      const mockTextarea = {
        value: '',
        style: {},
        setAttribute: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn()
      };
      
      Object.defineProperty(document, 'createElement', {
        value: vi.fn().mockReturnValue(mockTextarea),
        writable: true
      });
      
      Object.defineProperty(document.body, 'appendChild', {
        value: vi.fn(),
        writable: true
      });
      
      Object.defineProperty(document.body, 'removeChild', {
        value: vi.fn(),
        writable: true
      });
      
      const result = await clipboardHelper.copy('fallback only');
      
      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });
  });
});