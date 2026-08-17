import { useState } from 'react';
import { apiUrl } from './App.tsx';
import { buttonPrimaryClassName, container, textInputClassName } from '../style.ts';

export default function UserRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const handleRegisterClick = async () => {
    try {
      const response = await fetch(`${apiUrl}user-register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult('Error fetching user-register');
    }
  };

  return (
    <div className={container}>
      <h1>User Register</h1>
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
      <button onClick={handleRegisterClick} className={buttonPrimaryClassName}>
        Register
      </button>
      <label className="mt-4 whitespace-pre-wrap">{result}</label>
    </div>
  );
}
