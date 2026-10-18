import { Outlet } from 'react-router-dom';
import Sidebar, { type SidebarLink } from '../Sidebar.tsx';
import { container } from '../style.ts';

export const linkList: SidebarLink[] = [
  { to: '/schema', label: 'Schema' },
  { to: '/dynamic', label: 'Dynamic (Data)' },
  { to: '/design', label: 'Design' },
  { to: '/content', label: 'Content' },
];

// Schema page and its subpages (keeping their own paths), with a Sidebar for the second level navigation.
export default function SchemaLayout() {
  return (
    <div className={`${container} flex flex-col gap-4 py-4 md:flex-row md:gap-6`}>
      <Sidebar title="Schema" links={linkList} />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
