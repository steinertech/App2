import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch, useEffectOnce, VERSION_CLIENT } from '../util/util-main.ts';
import { container } from '../style.ts';
import { languageFromPathname } from '../util/util-i18n.ts';

export default function About() {
  const location = useLocation();
  const language = languageFromPathname(location.pathname);
  const [result, setResult] = useState('');

  useEffectOnce(() => {
    const handleVersionClick = async () => {
      try {
        const response = await apiFetch('version', {
          headers: { 'Accept-Language': language },
          credentials: 'include',
        });
        const data = await response.json();
        setResult(
          `VersionServer=${data.version}; VersionClient=${VERSION_CLIENT}; Domain=${data.domainName}; Email=${data.email}; Project=${data.projectName}; Text=${data.text};`,
        );
      } catch {
        setResult('Error fetching version');
      }
    };

    handleVersionClick();
  }, [language]);

  return (
    <div className={container}>
      <div className="prose">
        <h1>About</h1>
        <p>Demo app.</p>
      </div>
      <div>
        <label>{result}</label>
      </div>
    </div>
  );
}
