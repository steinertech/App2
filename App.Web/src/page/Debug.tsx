import { useEffect, useState } from 'react';
import { apiUrl } from './App.tsx';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { buttonPrimaryClassName, container, textInputClassName } from '../style.ts';

export default function Debug() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const { load } = useGridStore();

  useEffect(() => {
    void load('debug');
  }, [load]);

  const handleSessionClick = async () => {
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
      const data = await load('debug');
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching grid');
    }
  };

  const handleDebugClick = async () => {
    try {
      const response = await fetch(`${apiUrl}debug`, {
        credentials: 'include',
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching debug');
    }
  };

  return (
    <div className={container}>
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
      <button onClick={handleSessionClick} className={buttonPrimaryClassName}>
        Session
      </button>
      <button onClick={handleGridClick} className={`${buttonPrimaryClassName} mt-2`}>
        Grid
      </button>
      <button onClick={handleDebugClick} className={`${buttonPrimaryClassName} mt-2`}>
        Debug
      </button>
      <label className="mt-4 whitespace-pre-wrap">{result}</label>
      <div className="mt-4">
        <Grid path={[0]} />
      </div>
    </div>
  );
}
