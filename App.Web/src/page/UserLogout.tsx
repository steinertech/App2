import { useEffect, useState } from 'react';
import { refreshUserSession, userRequest } from '../UserSession.tsx';
import { UserRequestEnum } from '../../../App.Server/dto/shared/user-request-dto.ts';
import { container } from '../style.ts';

export default function UserLogout() {
  const [result, setResult] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await userRequest({ requestEnum: UserRequestEnum.Logout });
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
    <div className={container}>
      <h1>User Logout</h1>
      <label>{result}</label>
    </div>
  );
}
