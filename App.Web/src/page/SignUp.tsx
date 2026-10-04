import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { userRequest } from '../NavState.tsx';
import { UserRequestEnum } from '../../../App.Server/dto/shared/user-request-dto.ts';
import { buttonPrimaryClassName, textInputClassName } from '../style.ts';
import { languageFromPathname, withLanguagePrefix } from '../util/util-i18n.ts';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const language = languageFromPathname(useLocation().pathname);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      // Success and error messages are sent by the backend as alerts (shown in NavState).
      await userRequest({ requestEnum: UserRequestEnum.SignUp, email, password });
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
        <h1 className="text-center text-2xl font-semibold">Sign Up</h1>
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
            autoComplete="new-password"
            required
            className={textInputClassName}
          />
        </label>
        <button type="submit" className={`${buttonPrimaryClassName} mt-2`}>
          Sign Up
        </button>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to={withLanguagePrefix('/sign-in', language)} className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
