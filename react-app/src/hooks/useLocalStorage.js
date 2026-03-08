import { useState, useCallback } from 'react';
import { store } from '../store';

export function useLocalStorage(key, fallback = []) {
  const [value, setValueState] = useState(() => store.get(key, fallback));

  const setValue = useCallback((newVal) => {
    const v = typeof newVal === 'function' ? newVal(store.get(key, fallback)) : newVal;
    store.set(key, v);
    setValueState(v);
  }, [key]);

  const refresh = useCallback(() => {
    setValueState(store.get(key, fallback));
  }, [key]);

  return [value, setValue, refresh];
}
