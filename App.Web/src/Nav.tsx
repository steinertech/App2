import { useState } from 'react';
import { Link } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/debug', label: 'Debug' },
  { to: '/user-register', label: 'User Register' },
  { to: '/user-login', label: 'User Login' },
  { to: '/user-logout', label: 'User Logout' },
  { to: '/project', label: 'Project' },
  { to: '/storage', label: 'Storage' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-slate-900 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold" onClick={() => setOpen(false)}>
          App
        </Link>

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

        <div className="hidden md:flex md:items-center md:gap-6">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-slate-300">
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-1 px-4 pb-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="rounded px-2 py-2 hover:bg-slate-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
