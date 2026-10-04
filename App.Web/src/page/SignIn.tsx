import { useState } from 'react';
import { refreshNavState, userRequest } from '../NavState.tsx';
import { UserRequestEnum } from '../../../App.Server/dto/shared/user-request-dto.ts';
import { buttonPrimaryClassName, container, textInputClassName } from '../style.ts';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const handleSignInClick = async () => {
    try {
      const response = await userRequest({ requestEnum: UserRequestEnum.SignIn, email, password });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      if (response.ok) {
        refreshNavState();
      }
    } catch {
      setResult('Error fetching sign-in');
    }
  };

  return (
    <div className={container}>
      <h1>User Sign In</h1>
      <label className="mb-2">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${textInputClassName} ml-2`}
        />
      </label>
      <label className="mb-2">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${textInputClassName} ml-2`}
        />
      </label>
      <button onClick={handleSignInClick} className={buttonPrimaryClassName}>
        Sign In
      </button>
      <label className="mt-4 whitespace-pre-wrap">{result}</label>
    </div>
  );
}
