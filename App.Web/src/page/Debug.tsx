import { useEffect, useState } from 'react';
import { apiUrl } from './App.tsx';
import Grid from '../Grid.tsx';
import { Grid as GridModel, type GridDto } from '../util/util-grid.ts';
import { buttonPrimaryClassName, textInputClassName } from '../style.ts';

export default function Debug() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [grid] = useState(() => new GridModel(['project']));
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
        body: JSON.stringify({ areas: [{ gridName: 'project' }] }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching grid');
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1>Debug</h1>
      <label className="mb-2">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${textInputClassName} ml-2`}
        />
      </label>
      <button onClick={handleDebugDbClick} className={buttonPrimaryClassName}>
        DebugDb
      </button>
      <button onClick={handleUploadClick} className={`${buttonPrimaryClassName} mt-2`}>
        Upload
      </button>
      <button onClick={handleDownloadClick} className={`${buttonPrimaryClassName} mt-2`}>
        Download
      </button>
      {downloadUrl && (
        <a href={downloadUrl} target="_blank" rel="noreferrer" className="mt-2">
          {downloadUrl}
        </a>
      )}
      <button onClick={handleSessionIdClick} className={`${buttonPrimaryClassName} mt-2`}>
        SessionId
      </button>
      <button onClick={handleGridClick} className={`${buttonPrimaryClassName} mt-2`}>
        Grid
      </button>
      <label className="mt-4 whitespace-pre-wrap">{result}</label>
      <div className="mt-4">
        <Grid gridDto={gridDto} gridName="project" />
      </div>
    </div>
  );
}
