import { useState, useCallback, useEffect, useRef } from 'react';
import { Register } from '../types/register';

export interface HistoryToast {
  id: number;
  message: string;
  type: 'undo' | 'redo' | 'info';
}

interface RegisterHistoryEntry {
  past: Register[];
  future: Register[];
}

interface UseRegisterHistoryProps {
  registers: Register[];
  setRegisters: React.Dispatch<React.SetStateAction<Register[]>>;
  activeRegId: string;
}

export function useRegisterHistory({
  registers,
  setRegisters,
  activeRegId,
}: UseRegisterHistoryProps) {
  const [historyMap, setHistoryMap] = useState<Record<string, RegisterHistoryEntry>>({});
  const [toast, setToast] = useState<HistoryToast | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Keep a reference to current registers & activeRegId for event listeners
  const registersRef = useRef(registers);
  registersRef.current = registers;

  const activeRegIdRef = useRef(activeRegId);
  activeRegIdRef.current = activeRegId;

  const historyMapRef = useRef(historyMap);
  historyMapRef.current = historyMap;

  const showToast = useCallback((message: string, type: 'undo' | 'redo' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    const id = Date.now();
    setToast({ id, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2200);
  }, []);

  const activeHistory = historyMap[activeRegId] || { past: [], future: [] };
  const canUndo = activeHistory.past.length > 0;
  const canRedo = activeHistory.future.length > 0;
  const undoCount = activeHistory.past.length;
  const redoCount = activeHistory.future.length;

  // Update register while recording history snapshot
  const updateCurrentRegister = useCallback(
    (updater: (prev: Register) => Register) => {
      const currentRegId = activeRegIdRef.current;
      const currentReg = registersRef.current.find((r) => r.id === currentRegId);
      if (!currentReg) return;

      const updatedReg = updater(currentReg);

      // Verify if actual changes were made to avoid spamming identical snapshots
      const currentStr = JSON.stringify(currentReg);
      const updatedStr = JSON.stringify(updatedReg);
      if (currentStr === updatedStr) return;

      // Push a deep snapshot to past history and clear future (redo) stack
      const snapshot: Register = JSON.parse(currentStr);
      setHistoryMap((prev) => {
        const existing = prev[currentRegId] || { past: [], future: [] };
        return {
          ...prev,
          [currentRegId]: {
            past: [...existing.past, snapshot].slice(-50), // keep last 50 actions
            future: [], // New action resets redo stack
          },
        };
      });

      // Update state
      setRegisters((prev) =>
        prev.map((reg) => {
          if (reg.id === currentRegId) {
            return {
              ...updatedReg,
              updatedAt: new Date().toISOString().split('T')[0],
            };
          }
          return reg;
        })
      );
    },
    [setRegisters]
  );

  // Undo action
  const undo = useCallback(() => {
    const currentRegId = activeRegIdRef.current;
    const currentHist = historyMapRef.current[currentRegId];
    if (!currentHist || currentHist.past.length === 0) return;

    const currentReg = registersRef.current.find((r) => r.id === currentRegId);
    if (!currentReg) return;

    const previousState = currentHist.past[currentHist.past.length - 1];
    const newPast = currentHist.past.slice(0, -1);
    const newFuture = [JSON.parse(JSON.stringify(currentReg)), ...currentHist.future].slice(0, 50);

    setHistoryMap((prev) => ({
      ...prev,
      [currentRegId]: {
        past: newPast,
        future: newFuture,
      },
    }));

    setRegisters((prev) =>
      prev.map((r) => (r.id === currentRegId ? previousState : r))
    );

    showToast(`Undo: Restored previous state (${newPast.length} remaining)`, 'undo');
  }, [setRegisters, showToast]);

  // Redo action
  const redo = useCallback(() => {
    const currentRegId = activeRegIdRef.current;
    const currentHist = historyMapRef.current[currentRegId];
    if (!currentHist || currentHist.future.length === 0) return;

    const currentReg = registersRef.current.find((r) => r.id === currentRegId);
    if (!currentReg) return;

    const nextState = currentHist.future[0];
    const newFuture = currentHist.future.slice(1);
    const newPast = [...currentHist.past, JSON.parse(JSON.stringify(currentReg))].slice(-50);

    setHistoryMap((prev) => ({
      ...prev,
      [currentRegId]: {
        past: newPast,
        future: newFuture,
      },
    }));

    setRegisters((prev) =>
      prev.map((r) => (r.id === currentRegId ? nextState : r))
    );

    showToast(`Redo: Re-applied change (${newFuture.length} ahead)`, 'redo');
  }, [setRegisters, showToast]);

  // Universal Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl (Windows/Linux) or Cmd (Mac)
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;
      if (!isModifierPressed) return;

      const key = e.key.toLowerCase();

      // Check whether user is typing inside an active editable input or textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.getAttribute('contenteditable') === 'true';

      // If user is actively typing in a native text input, let default intra-input undo/redo happen
      // unless it's a readonly input or blurred
      if (isInput) {
        // If they press Ctrl+Y inside an input where browser doesn't handle redo, or if user presses Ctrl+Shift+Z
        if (key === 'y' || (key === 'z' && e.shiftKey)) {
          // If the input is not in the middle of active selection, allow register redo if desired,
          // or allow default input behavior
          return;
        }
        return;
      }

      // Universal Undo: Ctrl+Z or Cmd+Z (without Shift)
      if (key === 'z' && !e.shiftKey) {
        const hist = historyMapRef.current[activeRegIdRef.current];
        if (hist && hist.past.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          undo();
        }
      }

      // Universal Redo: Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        const hist = historyMapRef.current[activeRegIdRef.current];
        if (hist && hist.future.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [undo, redo]);

  return {
    updateCurrentRegister,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    toast,
  };
}
