import { useState } from 'react';
import { buttonPrimaryClassName } from '../style.ts';

export const apiUrl = '/api/';

export default function App() {
  const [count, setCount] = useState<number>(0);

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount((prev) => prev + 1)} className={buttonPrimaryClassName}>
        Click me
      </button>
    </div>
  );
}
