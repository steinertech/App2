import { Link, useLocation } from 'react-router-dom';
import { languageFromPathname, stripLanguagePrefix, withLanguagePrefix } from './util/util-i18n.ts';
import { sidebarClassName, sidebarLinkActiveClassName, sidebarLinkClassName } from './style.ts';

export interface SidebarLink {
  to: string; // Language neutral path, e.g. '/debug/debug-property'.
  label: string;
}

/** Second level navigation of a page, e.g. the Debug page and its subpages. */
export default function Sidebar({ title, links }: { title: string; links: SidebarLink[] }) {
  const location = useLocation();
  const language = languageFromPathname(location.pathname);
  const currentPath = stripLanguagePrefix(location.pathname);

  return (
    <aside className={sidebarClassName}>
      <h2 className="hidden px-3 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase md:block">{title}</h2>
      {links.map((link) => (
        <Link
          key={link.to}
          to={withLanguagePrefix(link.to, language)}
          aria-current={link.to === currentPath ? 'page' : undefined}
          className={link.to === currentPath ? sidebarLinkActiveClassName : sidebarLinkClassName}
        >
          {link.label}
        </Link>
      ))}
    </aside>
  );
}
