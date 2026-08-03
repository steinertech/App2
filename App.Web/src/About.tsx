import { useState } from 'react';
import Nav from './Nav.tsx';
import { apiUrl } from './App.tsx';

const VERSION_CLIENT = '1.13';

export default function About() {
  const [result, setResult] = useState('');
  const [origin, setOrigin] = useState('');

  const handleVersionClick = async () => {
    try {
      const response = await fetch(`${apiUrl}version`);
      const data = await response.json();
      setResult(`VersionServer=${data.version}; VersionClient=${VERSION_CLIENT};`);
      setOrigin(data.origin);
    } catch {
      setResult('Error fetching version');
      setOrigin('');
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
        <h1>About</h1>
        <div>
          <label>{result}</label>
          {origin && <label> ({origin})</label>}
        </div>
        <button
          onClick={handleVersionClick}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Version
        </button>
      </div>
    </div>
  );
}
