import { useEffect, useState } from 'react';
import { apiUrl } from './App.tsx';

export default function UserSession() {
  const [email, setEmail] = useState('');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${apiUrl}user-session`, { credentials: 'include' });
        const data = await response.json();
        setEmail(data?.email ?? '');
        setProjectName(data?.projectName ?? '');
      } catch {
        setEmail('');
        setProjectName('');
      }
    })();
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
