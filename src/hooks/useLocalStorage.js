import { useEffect, useMemo, useRef, useState } from 'react';
import { createId, fullKey, getData, normalizeList, setData } from '../utils/storage';

/**
 * React state that is persisted to storage and synced across browser tabs.
 * `normalize` validates stored data; invalid data falls back to `initialValue`.
 */
export function useLocalStorage(key, initialValue, normalize) {
  const [value, setValue] = useState(() => getData(key, initialValue, normalize));
  const config = useRef({ initialValue, normalize });

  useEffect(() => {
    setData(key, value);
  }, [key, value]);

  useEffect(() => {
    const reload = () => {
      const { initialValue: init, normalize: norm } = config.current;
      setValue(getData(key, init, norm));
    };
    // Other browser tabs
    const onStorage = (event) => event.key === fullKey(key) && reload();
    // Same tab, outside React (cloud sync)
    const onExternal = (event) => event.detail?.key === key && reload();
    window.addEventListener('storage', onStorage);
    window.addEventListener('lifeos:external-change', onExternal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lifeos:external-change', onExternal);
    };
  }, [key]);

  return [value, setValue];
}

/**
 * A persisted list of records with stable CRUD actions.
 * Every record gets an `id` and `createdAt`.
 */
export function useCollection(key, initialValue = []) {
  const [items, setItems] = useLocalStorage(key, initialValue, normalizeList);

  const actions = useMemo(
    () => ({
      add(item) {
        const record = { createdAt: new Date().toISOString(), ...item, id: createId() };
        setItems((prev) => [record, ...prev]);
        return record;
      },
      update(id, patch) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } : item,
          ),
        );
      },
      remove(id) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      },
      restore(record) {
        setItems((prev) => (prev.some((i) => i.id === record.id) ? prev : [record, ...prev]));
      },
      replaceAll(list) {
        setItems(list);
      },
    }),
    [setItems],
  );

  return [items, actions];
}
