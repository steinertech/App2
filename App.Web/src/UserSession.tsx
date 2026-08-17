import { useEffect, useState } from 'react';
import { apiUrl } from './page/App.tsx';

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
    <div className="bg-sky-200 px-4 py-2">
      {`Email=${email}; Project=${projectName};`}
    </div>
  );
}
