import { useEffect, useState } from 'react';
import { apiUrl } from './App.tsx';
import { refreshUserSession } from '../UserSession.tsx';

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      fontFamily: 'sans-serif'
    }}>
      <h1>User Logout</h1>
      <label>{result}</label>
    </div>
  );
}
