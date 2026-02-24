"use client";

import React, { useEffect, useState } from "react";

function CounterTickInner() {
  const [value, setValue] = useState(1247);

  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => v + Math.floor(Math.random() * 3) + 1);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-2xl font-bold tracking-tight text-ink">
        {value.toLocaleString("fr-FR")}
      </span>
      <span className="text-xs text-neutral-400">data points</span>
    </div>
  );
}

export const CounterTick = React.memo(CounterTickInner);
