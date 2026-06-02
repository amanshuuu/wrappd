import { useState, useCallback, useRef } from 'react';

let globalOpen = null;

export function useCartDrawer() {
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const timerRef = useRef(null);

  const openCartDrawer = useCallback((productName) => {
    setOpen(true);
    if (productName) {
      setJustAdded(productName);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustAdded(null), 3000);
    }
  }, []);

  const closeCartDrawer = useCallback(() => {
    setOpen(false);
    setJustAdded(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  globalOpen = openCartDrawer;

  return { open, justAdded, openCartDrawer, closeCartDrawer };
}

export function openCartDrawer(productName) {
  if (globalOpen) globalOpen(productName);
}
