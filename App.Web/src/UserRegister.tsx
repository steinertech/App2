import { useState } from 'react';
import Nav from './Nav.tsx';
import { apiUrl } from './App.tsx';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Nav />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        fontFamily: 'sans-serif'
      }}>
        <h1>User Register</h1>
        <label style={{ marginBottom: '8px' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginLeft: '8px', padding: '6px', fontSize: '16px' }}
          />
        </label>
        <label style={{ marginBottom: '8px' }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginLeft: '8px', padding: '6px', fontSize: '16px' }}
          />
        </label>
        <button
          onClick={handleRegisterClick}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Register
        </button>
        <label style={{ whiteSpace: 'pre-wrap', marginTop: '16px' }}>{result}</label>
      </div>
    </div>
  );
}
