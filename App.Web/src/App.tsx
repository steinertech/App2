import { useState } from 'react';
import Nav from './Nav.tsx';

export const apiUrl = 'https://app2-ng42wear3-my-9ef4.vercel.app/api/';

export default function App() {
  const [count, setCount] = useState<number>(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Nav />
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
    </div>
  );
}
