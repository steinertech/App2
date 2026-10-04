import { useEffect, useState } from 'react';
import { ALERT_EVENT, apiFetch, getAlertList, getIsProgress, PROGRESS_EVENT, removeAlert } from './util/util-main.ts';
import { UserRequestEnum, type UserRequestDto } from '../../App.Server/dto/shared/user-request-dto.ts';
import { AlertEnum } from '../../App.Server/dto/shared/alert-dto.ts';

const REFRESH_EVENT = 'nav-state-refresh';

const alertClassName: Record<AlertEnum, string> = {
  [AlertEnum.Success]: 'border-green-300 bg-green-100 text-green-800',
  [AlertEnum.Info]: 'border-blue-300 bg-blue-100 text-blue-800',
  [AlertEnum.Warning]: 'border-yellow-300 bg-yellow-100 text-yellow-800',
  [AlertEnum.Error]: 'border-red-300 bg-red-100 text-red-800',
};

export function refreshNavState() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function userRequest(dto: UserRequestDto) {
  return apiFetch('user', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
}

export default function NavState() {
  const [domainName, setDomainName] = useState('');
  const [email, setEmail] = useState('');
  const [projectName, setProjectName] = useState('');
  const [progress, setProgress] = useState(getIsProgress);
  const [alertList, setAlertList] = useState(getAlertList);

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
    const updateProgress = () => setProgress(getIsProgress());
    window.addEventListener(PROGRESS_EVENT, updateProgress);
    return () => window.removeEventListener(PROGRESS_EVENT, updateProgress);
  }, []);

  useEffect(() => {
    const updateAlertList = () => setAlertList(getAlertList());
    window.addEventListener(ALERT_EVENT, updateAlertList);
    return () => window.removeEventListener(ALERT_EVENT, updateAlertList);
  }, []);

  const alert = alertList[0];

  return (
    <div className="bg-sky-200">
      <div className="px-4 py-2">
        {`Domain=${domainName}; Email=${email}; Project=${projectName};`}
      </div>
      <div className="relative h-1 overflow-hidden">
        {progress > 0 && <div className="absolute inset-y-0 w-1/3 bg-sky-600 animate-progress" />}
      </div>
      {alert && (
        <div role="alert" className={`flex items-center gap-2 border-t px-4 py-2 ${alertClassName[alert.alertEnum]}`}>
          <span className="font-medium">{alert.alertEnum}:</span>
          <span className="flex-1">{alert.text}</span>
          <span className="rounded-full bg-white/70 px-2 text-sm font-medium" title="Open messages">
            {alertList.length}
          </span>
          <button
            onClick={removeAlert}
            className="cursor-pointer rounded px-2 text-lg leading-none hover:bg-black/10"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
