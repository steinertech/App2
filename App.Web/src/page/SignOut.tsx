import { useState } from 'react';
import { refreshNavState, userRequest } from '../NavState.tsx';
import { useEffectOnce } from '../util/util-main.ts';
import { UserRequestEnum } from '../../../App.Server/dto/shared/user-request-dto.ts';
import { container } from '../style.ts';

export default function SignOut() {
  const [result, setResult] = useState('');

  useEffectOnce(() => {
    (async () => {
      try {
        const response = await userRequest({ requestEnum: UserRequestEnum.SignOut });
        if (response.ok) {
          // Success message is sent by the backend as an alert (shown in NavState).
          refreshNavState();
        } else {
          setResult('Error fetching sign-out');
        }
      } catch {
        setResult('Error fetching sign-out');
      }
    })();
  }, []);

  return (
    <div className={container}>
      <h1>User Sign Out</h1>
      <label>{result}</label>
    </div>
  );
}
