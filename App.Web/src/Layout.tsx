import { Outlet } from 'react-router-dom';
import Nav from './Nav.tsx';
import UserSession from './UserSession.tsx';

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Nav />
      <UserSession />
      <Outlet />
    </div>
  );
}
