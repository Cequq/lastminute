
import { useSyncExternalStore, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getMyLocation } from './geo';

// Байршлыг бүх газрын зурагт хуваалцах store
const KEY = 'lm.location';

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) ?? null;
  } catch {
    return null;
  }
}

let state = {
  pos: read(),
  loading: false,
};

const listeners = new Set();
let autoRequested = false;

function set(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

// Байршил авах
export async function requestLocation() {
  if (state.loading) return state.pos;

  set({ loading: true });

  try {
    const pos = await getMyLocation();

    try {
      sessionStorage.setItem(KEY, JSON.stringify(pos));
    } catch {
      // SessionStorage ашиглах боломжгүй үед алгасна
    }

    set({ pos, loading: false });
    return pos;
  } catch (error) {
    set({ loading: false });
    toast.error(error.message);
    return null;
  }
}

// Автоматаар байршил авах
export function useMyLocation({ auto = false } = {}) {
  const snap = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );

  useEffect(() => {
    if (auto && !state.pos && !autoRequested) {
      autoRequested = true;
      requestLocation();
    }
  }, [auto]);

  return {
    ...snap,
    request: requestLocation,
  };
}
