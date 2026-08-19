import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { languageFromPathname, stripLanguagePrefix, withLanguagePrefix, type Language } from './util/util-i18n.ts';

const links = [
  { to: '/', key: 'home', label: 'Home' },
  { to: '/storage', key: 'storage', label: 'Storage' },
  { to: '/project', key: 'project', label: 'Project' },
  { to: '/debug', key: 'debug', label: 'Debug' },
  { to: '/user-register', key: 'user-register', label: 'Sign Up' },
  { to: '/user-logout', key: 'user-logout', label: 'Logout' },
  { to: '/user-login', key: 'user-login', label: 'Login' },
  { to: '/about', key: 'about', label: 'About' },
];

function linkLabel(key: string, label: string, language: Language): string {
  return key === 'about' && language === 'de' ? 'Über' : label;
}

function LanguageSwitch({ pathname, language }: { pathname: string; language: Language }) {
  const nextLanguage = language === 'en' ? 'de' : 'en';
  return (
    <Link to={withLanguagePrefix(pathname, nextLanguage)} className="text-sm text-slate-400 hover:text-white">
      {nextLanguage.toUpperCase()}
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const language = languageFromPathname(location.pathname);
  const currentPath = stripLanguagePrefix(location.pathname);

  return (
    <nav className="bg-slate-900 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={withLanguagePrefix('/', language)} className="text-lg font-semibold" onClick={() => setOpen(false)}>
          App
        </Link>

        <div className="hidden md:flex md:items-center md:gap-6">
          {links.map((link) => (
            <Link
              key={link.key}
              to={withLanguagePrefix(link.to, language)}
              className={link.to === currentPath ? 'font-semibold text-white' : 'text-slate-400 hover:text-slate-300'}
            >
              {linkLabel(link.key, link.label, language)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitch pathname={location.pathname} language={language} />

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="flex flex-col gap-1.5 p-2 md:hidden"
          >
            <span className={`h-0.5 w-6 bg-white transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`h-0.5 w-6 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 w-6 bg-white transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-1 px-4 pb-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.key}
              to={withLanguagePrefix(link.to, language)}
              onClick={() => setOpen(false)}
              className={`rounded px-2 py-2 hover:bg-slate-800 ${
                link.to === currentPath ? 'bg-slate-800 font-semibold text-white' : ''
              }`}
            >
              {linkLabel(link.key, link.label, language)}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
