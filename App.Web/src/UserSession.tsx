import { useEffect, useState } from 'react';
import { apiUrl } from './page/App.tsx';
import { UserRequestEnum, type UserRequestDto } from '../../App.Server/dto/shared/user-request-dto.ts';

const REFRESH_EVENT = 'user-session-refresh';
const PROGRESS_EVENT = 'user-session-progress';

let isProgress = 0;

export function refreshUserSession() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/** Progress counter; the progress bar at the bottom of UserSession animates while it is > 0. */
export function getIsProgress() {
  return isProgress;
}

export function setIsProgress(value: number) {
  isProgress = value;
  window.dispatchEvent(new Event(PROGRESS_EVENT));
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
  const [progress, setProgress] = useState(isProgress);

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

  useEffect(() => {
    const updateProgress = () => setProgress(isProgress);
    window.addEventListener(PROGRESS_EVENT, updateProgress);
    return () => window.removeEventListener(PROGRESS_EVENT, updateProgress);
  }, []);

  return (
    <div className="bg-sky-200">
      <div className="px-4 py-2">
        {`Domain=${domainName}; Email=${email}; Project=${projectName};`}
      </div>
      <div className="relative h-1 overflow-hidden">
        {progress > 0 && <div className="absolute inset-y-0 w-1/3 bg-sky-600 animate-progress" />}
      </div>
    </div>
  );
}
