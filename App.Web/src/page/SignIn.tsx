import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { refreshNavState, userRequest } from '../NavState.tsx';
import { UserRequestEnum } from '../../../App.Server/dto/shared/user-request-dto.ts';
import { buttonPrimaryClassName, textInputClassName } from '../style.ts';
import { languageFromPathname, withLanguagePrefix } from '../util/util-i18n.ts';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const language = languageFromPathname(useLocation().pathname);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      // Errors and the redirect to Home (on success) are sent by the backend (alert / redirect header).
      const response = await userRequest({ requestEnum: UserRequestEnum.SignIn, email, password });
      if (response.ok) {
        refreshNavState();
      }
    } catch {
      // No response; apiFetch already added an Error alert.
    }
  };

  return (
    <div className="flex flex-1 items-start justify-center px-4 pt-16">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-gray-200 bg-white p-8 shadow-md"
      >
        <h1 className="text-center text-2xl font-semibold">Sign In</h1>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={textInputClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={textInputClassName}
          />
        </label>
        <button type="submit" className={`${buttonPrimaryClassName} mt-2`}>
          Sign In
        </button>
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to={withLanguagePrefix('/sign-up', language)} className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
