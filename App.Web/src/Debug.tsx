import { useState } from 'react';
import Nav from './Nav.tsx';
import { apiUrl } from './App.tsx';

export default function Debug() {
  const [result, setResult] = useState('');

  const handleDebugDbClick = async () => {
    try {
      const response = await fetch(`${apiUrl}debug-db`);
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching debug-db');
    }
  };

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
        <h1>Debug</h1>
        <button
          onClick={handleDebugDbClick}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          DebugDb
        </button>
        <label style={{ whiteSpace: 'pre-wrap', marginTop: '16px' }}>{result}</label>
      </div>
    </div>
  );
}
