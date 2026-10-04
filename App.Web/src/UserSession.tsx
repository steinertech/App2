import { useEffect, useState } from 'react';
import { apiUrl } from './page/App.tsx';
import { UserRequestEnum, type UserRequestDto } from '../../App.Server/dto/shared/user-request-dto.ts';

const REFRESH_EVENT = 'user-session-refresh';

export function refreshUserSession() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function userRequest(dto: UserRequestDto) {
  return fetch(`${apiUrl}user`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
}

export default function UserSession() {
  const [domainName, setDomainName] = useState('');
  const [email, setEmail] = useState('');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await userRequest({ requestEnum: UserRequestEnum.Session });
        const data = await response.json();
        setDomainName(data?.domainName ?? '');
        setEmail(data?.email ?? '');
        setProjectName(data?.projectName ?? '');
      } catch {
        setDomainName('');
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
      {`Domain=${domainName}; Email=${email}; Project=${projectName};`}
    </div>
  );
}
