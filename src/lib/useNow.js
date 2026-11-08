import { useEffect, useState } from 'react';

// Бүх тоолуур, үнэ нэг л цагаар шинэчлэгдэх хуваалцсан "одоо"
const listeners = new Set();
let timer = null;

function subscribe(fn) {
  listeners.add(fn);
  if (!timer) timer = setInterval(() => { const t = Date.now(); listeners.forEach((l) => l(t)); }, 1000);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) { clearInterval(timer); timer = null; }
  };
}

export function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => subscribe(setNow), []);
  return now;
}
