import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  /** Key for localStorage */
  storageKey: string;
  /** Data to save */
  data: T;
  /** Server save function (optional) */
  onServerSave?: (data: T) => Promise<void>;
  /** Debounce delay in ms (default 30000 = 30s) */
  debounceMs?: number;
  /** Whether autosave is enabled */
  enabled?: boolean;
}

/**
 * Autosave hook — saves draft to localStorage immediately,
 * and to server with debounce (30s default).
 */
export function useAutoSave<T>({
  storageKey,
  data,
  onServerSave,
  debounceMs = 30_000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const isSavingRef = useRef(false);

  // Keep ref in sync
  dataRef.current = data;

  // Save to localStorage (immediate)
  const saveLocal = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataRef.current));
    } catch {
      // localStorage might be full — ignore
    }
  }, [storageKey]);

  // Save to server (debounced)
  const saveServer = useCallback(async () => {
    if (!onServerSave || isSavingRef.current) return;

    isSavingRef.current = true;
    try {
      await onServerSave(dataRef.current);
    } catch {
      // Server save failed — data is in localStorage
    } finally {
      isSavingRef.current = false;
    }
  }, [onServerSave]);

  // Effect: save on data change
  useEffect(() => {
    if (!enabled) return;

    // Save to localStorage immediately
    saveLocal();

    // Debounce server save
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      saveServer();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, enabled, saveLocal, saveServer, debounceMs]);

  // Load from localStorage
  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // corrupted data — ignore
    }
    return null;
  }, [storageKey]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { loadDraft, clearDraft, saveLocal, saveServer };
}
