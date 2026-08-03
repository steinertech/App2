import { useState } from 'react';
import Nav from './Nav.tsx';
import { apiUrl } from './App.tsx';

export default function About() {
  const [version, setVersion] = useState('');

  const handleVersionClick = async () => {
    try {
      const response = await fetch(`${apiUrl}version`);
      const data = await response.json();
      setVersion(data.version);
    } catch {
      setVersion('Error fetching version');
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
        <label>{version}</label>
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
