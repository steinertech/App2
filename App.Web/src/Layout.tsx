import { Outlet } from 'react-router-dom';
import Nav from './Nav.tsx';
import UserSession from './UserSession.tsx';
import { GridStoreProvider } from './GridStore.tsx';

export default function Layout() {
  return (
    <GridStoreProvider>
      <div className="flex h-screen flex-col">
        <Nav />
        <UserSession />
        <Outlet />
      </div>
    </GridStoreProvider>
  );
}
