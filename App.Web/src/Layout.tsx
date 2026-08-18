import { Outlet } from 'react-router-dom';
import Nav from './Nav.tsx';
import UserSession from './UserSession.tsx';
import { StoreProvider } from './Store.tsx';

export default function Layout() {
  return (
    <StoreProvider>
      <div className="flex h-screen flex-col">
        <Nav />
        <UserSession />
        <Outlet />
      </div>
    </StoreProvider>
  );
}
