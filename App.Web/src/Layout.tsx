import { Outlet } from 'react-router-dom';
import Nav from './Nav.tsx';
import UserSession from './UserSession.tsx';

export default function Layout() {
  return (
    <div className="flex h-screen flex-col">
      <Nav />
      <UserSession />
      <Outlet />
    </div>
  );
}
