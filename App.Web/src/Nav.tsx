import { Link } from 'react-router-dom';

export default function Nav() {
  return (
    <nav style={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
      fontFamily: 'sans-serif'
    }}>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/debug">Debug</Link>
      <Link to="/user-register">User Register</Link>
      <Link to="/user-login">User Login</Link>
      <Link to="/user-logout">User Logout</Link>
    </nav>
  );
}
