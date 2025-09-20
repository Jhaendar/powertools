/**
 * Clipboard helper utility with browser compatibility
 * Provides cross-browser clipboard functionality with fallbacks
 */

export interface ClipboardHelper {
  copy: (text: string) => Promise<boolean>;
  isSupported: () => boolean;
}

class ClipboardHelperImpl implements ClipboardHelper {
  /**
   * Check if clipboard API is supported in the current browser
   */
  isSupported(): boolean {
    return !!(
      navigator.clipboard && 
      typeof navigator.clipboard.writeText === 'function' && 
      window.isSecureContext
    );
  }

  /**
   * Copy text to clipboard with fallback for older browsers
   * @param text - Text to copy to clipboard
   * @returns Promise<boolean> - Success status
   */
  async copy(text: string): Promise<boolean> {
    try {
      // Modern clipboard API (preferred method)
      if (this.isSupported()) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers or non-secure contexts
      return this.fallbackCopy(text);
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
      // Try fallback method if modern API fails
      return this.fallbackCopy(text);
    }
  }

  /**
   * Fallback copy method using document.execCommand
   * @param text - Text to copy
   * @returns boolean - Success status
   */
  private fallbackCopy(text: string): boolean {
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      textarea.setAttribute('readonly', '');
      
      document.body.appendChild(textarea);
      
      // Select and copy the text
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      return success;
    } catch (error) {
      console.warn('Fallback clipboard copy failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const clipboardHelper = new ClipboardHelperImpl();

/**
 * Simple copy to clipboard function
 * @param text - Text to copy to clipboard
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  return clipboardHelper.copy(text);
}

/**
 * Check if clipboard functionality is available
 * @returns boolean - Whether clipboard is supported
 */
export function isClipboardSupported(): boolean {
  return clipboardHelper.isSupported();
}