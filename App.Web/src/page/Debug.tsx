import { useState } from 'react';
import { userRequest } from '../NavState.tsx';
import { addAlert, getIsProgress, setIsProgress, useEffectOnce } from '../util/util-main.ts';
import { UserRequestEnum } from '../../../App.Server/dto/shared/user-request-dto.ts';
import { AlertEnum } from '../../../App.Server/dto/shared/alert-dto.ts';
import Grid from '../Grid.tsx';
import { resolveGrid, useGridStore } from '../GridStore.tsx';
import { buttonPrimaryClassName, container, textInputClassName } from '../style.ts';

export default function Debug() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const { gridPlaneDto, load } = useGridStore();

  useEffectOnce(() => {
    void load('debug');
  }, [load]);

  // Delete confirmation, opened by the server at GridPlaneDto.grids[0].planes[1].grids[0].
  const modalPath = [0, 1, 0];
  const isModal = resolveGrid(gridPlaneDto.grids, modalPath) !== undefined;

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
      <button onClick={() => addAlert(AlertEnum.Success, 'Data has ben saved.')} className={`${buttonPrimaryClassName} mt-2`}>
        Success
      </button>
      <button onClick={() => addAlert(AlertEnum.Error, 'Hello error!')} className={`${buttonPrimaryClassName} mt-2`}>
        Error
      </button>
      <label className="mt-4 whitespace-pre-wrap">{result}</label>
      <div className="mt-4">
        <Grid path={[0]} />
      </div>
      {isModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Grid path={modalPath} />
          </div>
        </div>
      )}
    </div>
  );
}
