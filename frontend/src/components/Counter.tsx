import { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  step?: number;
  min?: number;
  max?: number;
}

export function Counter({
  initialValue = 0,
  step = 1,
  min = -Infinity,
  max = Infinity
}: CounterProps) {
  const [count, setCount] = useState(initialValue);

  const increment = () => {
    setCount(prev => Math.min(prev + step, max));
  };

  const decrement = () => {
    setCount(prev => Math.max(prev - step, min));
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={decrement}
        disabled={count <= min}
        className="px-3 py-1 text-lg font-bold bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
        aria-label="Decrementar"
      >
        -
      </button>

      <span className="min-w-[3rem] text-center text-xl font-semibold text-white">
        {count}
      </span>

      <button
        onClick={increment}
        disabled={count >= max}
        className="px-3 py-1 text-lg font-bold bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
        aria-label="Incrementar"
      >
        +
      </button>
    </div>
  );
}
