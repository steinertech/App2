import { useState } from 'react';

export const apiUrl = '/api/';

export default function App() {
  const [count, setCount] = useState<number>(0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      fontFamily: 'sans-serif'
    }}>
      <h1>Count: {count}</h1>
      <button
        onClick={() => setCount((prev) => prev + 1)}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Click me
      </button>
    </div>
  );
}
