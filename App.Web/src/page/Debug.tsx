import { useEffect, useState } from 'react';
import { apiUrl } from './App.tsx';
import Grid from '../Grid.tsx';
import { Grid as GridModel, type GridDto } from '../util/util-grid.ts';

export default function Debug() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [grid] = useState(() => new GridModel('project'));
  const [gridDto, setGridDto] = useState<GridDto>(grid.gridDto);

  useEffect(() => {
    (async () => {
      setGridDto(await grid.load());
    })();
  }, [grid]);

  const handleDebugDbClick = async () => {
    try {
      const response = await fetch(`${apiUrl}debug-db`, {
        method: 'POST',
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching debug-db');
    }
  };

  const handleUploadClick = async () => {
    try {
      const response = await fetch(`${apiUrl}storage-upload`);
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching upload');
    }
  };

  const handleDownloadClick = async () => {
    try {
      const response = await fetch(`${apiUrl}storage-download`);
      const data = await response.json();
      setDownloadUrl(data.url);
    } catch {
      setResult('Error fetching download');
    }
  };

  const handleSessionIdClick = async () => {
    try {
      const response = await fetch(`${apiUrl}user-session`, {
        credentials: 'include',
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching user-session');
    }
  };

  const handleGridClick = async () => {
    try {
      const response = await fetch(`${apiUrl}grid`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gridName: 'project' }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching grid');
    }
  };

  return (
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
      <button
        onClick={handleDownloadClick}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' }}
      >
        Download
      </button>
      {downloadUrl && (
        <a href={downloadUrl} target="_blank" rel="noreferrer" style={{ marginTop: '8px' }}>
          {downloadUrl}
        </a>
      )}
      <button
        onClick={handleSessionIdClick}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' }}
      >
        SessionId
      </button>
      <button
        onClick={handleGridClick}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' }}
      >
        Grid
      </button>
      <label style={{ whiteSpace: 'pre-wrap', marginTop: '16px' }}>{result}</label>
      <div style={{ marginTop: '16px' }}>
        <Grid gridDto={gridDto} gridAreaName="main" />
      </div>
    </div>
  );
}
