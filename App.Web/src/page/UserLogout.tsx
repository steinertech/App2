import { useEffect, useState } from 'react';
import { apiUrl } from './App.tsx';
import { refreshUserSession } from '../UserSession.tsx';
import { container } from '../style.ts';

export default function UserLogout() {
  const [result, setResult] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${apiUrl}user-logout`, { credentials: 'include' });
        if (response.ok) {
          setResult('You successfully logged out');
          refreshUserSession();
        } else {
          setResult('Error fetching user-logout');
        }
      } catch {
        setResult('Error fetching user-logout');
      }
    })();
  }, []);

  return (
    <div className={container}>
      <h1>User Logout</h1>
      <label>{result}</label>
    </div>
  );
}
