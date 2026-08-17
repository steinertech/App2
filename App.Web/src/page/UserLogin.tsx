import { useState } from 'react';
import { apiUrl } from './App.tsx';
import { refreshUserSession } from '../UserSession.tsx';
import { buttonPrimaryClassName, textInputClassName } from '../style.ts';

export default function UserLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const handleLoginClick = async () => {
    try {
      const response = await fetch(`${apiUrl}user-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      if (response.ok) {
        refreshUserSession();
      }
    } catch {
      setResult('Error fetching user-login');
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1>User Login</h1>
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
      <button onClick={handleLoginClick} className={buttonPrimaryClassName}>
        Login
      </button>
      <label className="mt-4 whitespace-pre-wrap">{result}</label>
    </div>
  );
}
