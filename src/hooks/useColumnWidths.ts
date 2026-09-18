import React, { useState, useCallback, useRef } from 'react';

export function useColumnWidths(pageKey: string, defaultWidths: Record<string, number>) {
  const storageKey = `vms_widths_${pageKey}`;

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...defaultWidths, ...parsed };
        }
      } catch (e) {
        console.error('Failed to parse column widths:', e);
      }
    }
    return defaultWidths;
  });

  const activeDragRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = widths[colKey] || defaultWidths[colKey] || 100;

      activeDragRef.current = { colKey, startX, startWidth };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!activeDragRef.current) return;
        const delta = moveEvent.clientX - activeDragRef.current.startX;
        const newWidth = Math.max(45, Math.min(600, activeDragRef.current.startWidth + delta));

        setWidths((prev) => {
          const updated = { ...prev, [activeDragRef.current!.colKey]: newWidth };
          return updated;
        });
      };

      const onMouseUp = () => {
        if (activeDragRef.current) {
          setWidths((current) => {
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem(storageKey, JSON.stringify(current));
              } catch {}
            }
            return current;
          });
        }
        activeDragRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [widths, defaultWidths, storageKey]
  );

  const getWidth = useCallback(
    (colKey: string): number => {
      return widths[colKey] || defaultWidths[colKey] || 100;
    },
    [widths, defaultWidths]
  );

  const resetWidths = useCallback(() => {
    setWidths(defaultWidths);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [defaultWidths, storageKey]);

  return { widths, getWidth, startResize, startResizing: startResize, resetWidths };
}
