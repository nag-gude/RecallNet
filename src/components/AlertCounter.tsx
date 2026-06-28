"use client";

import { useEffect, useState } from "react";

export default function AlertCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let frame = 0;
    const steps = Math.min(target, 20);
    const interval = setInterval(() => {
      frame++;
      setCount(Math.round((frame / steps) * target));
      if (frame >= steps) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <span className="tabular-nums animate-count-up font-bold text-red-600">
      {count}
    </span>
  );
}
