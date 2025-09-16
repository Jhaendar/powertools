import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// Base64 encoding/decoding utilities for URL-safe state serialization
const encodeState = (state: any): string => {
  try {
    const jsonString = JSON.stringify(state);
    return btoa(encodeURIComponent(jsonString));
  } catch (error) {
    console.warn('Failed to encode state:', error);
    return '';
  }
};

const decodeState = <T>(encodedState: string): T | null => {
  try {
    const jsonString = decodeURIComponent(atob(encodedState));
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('Failed to decode state:', error);
    return null;
  }
};

// Hook for persisting tool state in URL parameters
export const useURLState = <T extends Record<string, any>>(
  initialState: T,
  stateKey: string = 'state'
): [T, (newState: Partial<T>) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current state from URL or use initial state
  const getCurrentState = useCallback((): T => {
    const encodedState = searchParams.get(stateKey);
    if (encodedState) {
      const decodedState = decodeState<T>(encodedState);
      if (decodedState) {
        return { ...initialState, ...decodedState };
      }
    }
    return initialState;
  }, [searchParams, stateKey, initialState]);

  // Update state and URL
  const updateState = useCallback((newState: Partial<T>) => {
    const currentState = getCurrentState();
    const updatedState = { ...currentState, ...newState };
    
    // Only persist non-empty, meaningful state
    const stateToEncode = Object.fromEntries(
      Object.entries(updatedState).filter(([, value]) => {
        // Don't persist empty strings, null, undefined, or empty arrays
        if (value === '' || value === null || value === undefined) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
        return true;
      })
    );

    const encodedState = encodeState(stateToEncode);
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (encodedState && Object.keys(stateToEncode).length > 0) {
        newParams.set(stateKey, encodedState);
      } else {
        newParams.delete(stateKey);
      }
      return newParams;
    });
  }, [getCurrentState, setSearchParams, stateKey]);

  return [getCurrentState(), updateState];
};

// Hook for persisting simple key-value pairs in URL
export const useURLParam = (
  key: string,
  defaultValue: string = ''
): [string, (value: string) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key) || defaultValue;

  const setValue = useCallback((newValue: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newValue && newValue !== defaultValue) {
        newParams.set(key, newValue);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [key, defaultValue, setSearchParams]);

  return [value, setValue];
};

// Local storage utilities for cross-session persistence
export const localStorageState = {
  save: <T>(key: string, state: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  load: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};

// Hook for combining URL state with localStorage fallback
export const usePersistentState = <T extends Record<string, any>>(
  toolId: string,
  initialState: T
): [T, (newState: Partial<T>) => void] => {
  const storageKey = `devtools-${toolId}-state`;
  const [urlState, setUrlState] = useURLState(initialState);

  // Load from localStorage on mount if URL state is empty
  useEffect(() => {
    const hasUrlState = Object.keys(urlState).some(key => 
      urlState[key] !== initialState[key]
    );

    if (!hasUrlState) {
      const savedState = localStorageState.load<T>(storageKey);
      if (savedState) {
        setUrlState(savedState);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  const updateState = useCallback((newState: Partial<T>) => {
    const updatedState = { ...urlState, ...newState };
    localStorageState.save(storageKey, updatedState);
    setUrlState(newState);
  }, [urlState, setUrlState, storageKey]);

  return [urlState, updateState];
};

// Utility for generating shareable URLs
export const generateShareableURL = (toolPath: string, state: Record<string, any>): string => {
  const baseUrl = window.location.origin + window.location.pathname;
  const encodedState = encodeState(state);
  const url = new URL(`${baseUrl}#${toolPath}`);
  
  if (encodedState) {
    url.searchParams.set('state', encodedState);
  }
  
  return url.toString();
};

// Utility for parsing shared URLs
export const parseSharedURL = <T>(url: string): { toolPath: string; state: T | null } => {
  try {
    const urlObj = new URL(url);
    const toolPath = urlObj.hash.replace('#', '');
    const encodedState = urlObj.searchParams.get('state');
    const state = encodedState ? decodeState<T>(encodedState) : null;
    
    return { toolPath, state };
  } catch (error) {
    console.warn('Failed to parse shared URL:', error);
    return { toolPath: '', state: null };
  }
};