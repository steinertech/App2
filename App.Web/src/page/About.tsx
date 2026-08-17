import { useState } from 'react';
import { apiUrl } from './App.tsx';
import { VERSION_CLIENT } from '../util/util-main.ts';
import { buttonPrimaryClassName } from '../style.ts';

export default function About() {
  const [result, setResult] = useState('');
  const [domainName, setDomainName] = useState('');

  const handleVersionClick = async () => {
    try {
      const response = await fetch(`${apiUrl}version`);
      const data = await response.json();
      setResult(`VersionServer=${data.version}; VersionClient=${VERSION_CLIENT}; HelloWorld=${data.helloWorld};`);
      setDomainName(data.domainName);
    } catch {
      setResult('Error fetching version');
      setDomainName('');
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1>About</h1>
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
