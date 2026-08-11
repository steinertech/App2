import { useEffect, useState } from 'react';
import { apiUrl } from './App.tsx';

const REFRESH_EVENT = 'user-session-refresh';

export function refreshUserSession() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export default function UserSession() {
  const [email, setEmail] = useState('');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${apiUrl}user-session`, { credentials: 'include' });
        const data = await response.json();
        setEmail(data?.email ?? '');
        setProjectName(data?.projectName ?? '');
      } catch {
        setEmail('');
        setProjectName('');
      }
    };

    fetchSession();
    window.addEventListener(REFRESH_EVENT, fetchSession);
    return () => window.removeEventListener(REFRESH_EVENT, fetchSession);
  }, []);

  return (
    <div style={{
      backgroundColor: 'lightblue',
      padding: '8px 16px',
      fontFamily: 'sans-serif'
    }}>
      {`Email=${email}; Project=${projectName};`}
    </div>
  );
}
