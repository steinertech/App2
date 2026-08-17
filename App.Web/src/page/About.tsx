import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiUrl } from './App.tsx';
import { VERSION_CLIENT } from '../util/util-main.ts';
import { buttonPrimaryClassName, container } from '../style.ts';
import { languageFromPathname } from '../util/util-i18n.ts';

export default function About() {
  const location = useLocation();
  const language = languageFromPathname(location.pathname);
  const [result, setResult] = useState('');
  const [domainName, setDomainName] = useState('');

  const handleVersionClick = async () => {
    try {
      const response = await fetch(`${apiUrl}version`, { headers: { 'Accept-Language': language } });
      const data = await response.json();
      setResult(`VersionServer=${data.version}; VersionClient=${VERSION_CLIENT}; Text=${data.text};`);
      setDomainName(data.domainName);
    } catch {
      setResult('Error fetching version');
      setDomainName('');
    }
  };

  return (
    <div className={container}>
      <h1>{language === 'de' ? 'Über' : 'About'}</h1>
      <div>
        <label>{result}</label>
        {domainName && <label> ({domainName})</label>}
      </div>
      <button onClick={handleVersionClick} className={buttonPrimaryClassName}>
        Version
      </button>
    </div>
  );
}
