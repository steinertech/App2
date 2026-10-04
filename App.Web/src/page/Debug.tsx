import { useEffect, useState } from 'react';
import { userRequest } from '../UserSession.tsx';
import { getIsProgress, setIsProgress } from '../util/util-main.ts';
import { UserRequestEnum } from '../../../App.Server/dto/shared/user-request-dto.ts';
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
      const response = await userRequest({ requestEnum: UserRequestEnum.Session });
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

  const handleProgressClick = () => {
    setIsProgress(getIsProgress() === 0 ? 1 : 0);
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
      <button onClick={handleProgressClick} className={`${buttonPrimaryClassName} mt-2`}>
        Progress
      </button>
      <label className="mt-4 whitespace-pre-wrap">{result}</label>
      <div className="mt-4">
        <Grid path={[0]} />
      </div>
    </div>
  );
}
