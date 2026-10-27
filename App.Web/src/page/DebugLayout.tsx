import { Outlet } from 'react-router-dom';
import Sidebar, { type SidebarLink } from '../Sidebar.tsx';
import { container } from '../style.ts';

const linkList: SidebarLink[] = [
  { to: '/debug', label: 'Debug' },
  { to: '/debug/debug-property', label: 'Debug Property' },
  { to: '/debug/debug-dynamic', label: 'Debug Dynamic' },
];

// Debug page and its subpages, with a Sidebar for the second level navigation.
export default function DebugLayout() {
  return (
    <div className={`${container} flex flex-col gap-4 py-4 md:flex-row md:gap-6`}>
      <Sidebar title="Debug" links={linkList} />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
