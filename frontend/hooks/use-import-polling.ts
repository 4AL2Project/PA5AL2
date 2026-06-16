'use client';

import { useEffect, useRef, useState } from 'react';

import { fetchImport } from '@/lib/api';
import { ImportRecord, ImportStatus } from '@/lib/types';

const TERMINAL: ImportStatus[] = ['TERMINÉ', 'ÉCHOUÉ'];

/**
 * Polls GET /api/imports/:id every `interval` ms until the import reaches a
 * terminal status (TERMINÉ or ÉCHOUÉ), then stops automatically.
 */
export function useImportPolling(
  importId: string | null,
  interval = 2000
): ImportRecord | null {
  const [record, setRecord] = useState<ImportRecord | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!importId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await fetchImport(importId);
        if (cancelled) return;
        setRecord(data);
        if (TERMINAL.includes(data.status) && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch {
        // transient error — keep polling
      }
    };

    poll();
    timerRef.current = setInterval(poll, interval);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [importId, interval]);

  return record;
}
