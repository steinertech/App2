import { useState } from 'react';
import Nav from './Nav.tsx';
import { apiUrl } from './App.tsx';

const VERSION_CLIENT = '1.14';

export default function About() {
  const [result, setResult] = useState('');
  const [domainName, setDomainName] = useState('');

  const handleVersionClick = async () => {
    try {
      const response = await fetch(`${apiUrl}version`);
      const data = await response.json();
      setResult(`VersionServer=${data.version}; VersionClient=${VERSION_CLIENT};`);
      setDomainName(data.domainName);
    } catch {
      setResult('Error fetching version');
      setDomainName('');
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
          {domainName && <label> ({domainName})</label>}
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
