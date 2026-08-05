import { useState } from 'react';
import Nav from './Nav.tsx';
import { apiUrl } from './App.tsx';

export default function Debug() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');

  const handleDebugDbClick = async () => {
    try {
      const response = await fetch(`${apiUrl}debug-db`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching debug-db');
    }
  };

  const handleUploadClick = async () => {
    try {
      const response = await fetch(`${apiUrl}upload`);
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching upload');
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
        <label style={{ marginBottom: '8px' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginLeft: '8px', padding: '6px', fontSize: '16px' }}
          />
        </label>
        <button
          onClick={handleDebugDbClick}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          DebugDb
        </button>
        <button
          onClick={handleUploadClick}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' }}
        >
          Upload
        </button>
        <label style={{ whiteSpace: 'pre-wrap', marginTop: '16px' }}>{result}</label>
      </div>
    </div>
  );
}
