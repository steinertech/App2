import { useEffect, useState } from 'react';
import Grid, { type GridColumn } from './Grid.tsx';
import { apiUrl } from './App.tsx';

interface ProjectRow {
  name?: string;
  sectorKey?: string;
}

const columns: GridColumn<ProjectRow>[] = [
  { key: 'name', label: 'Name' },
  { key: 'sectorKey', label: 'Sector Key' },
];

export default function Project() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${apiUrl}project-list`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? 'Error fetching projects');
          return;
        }
        setProjects(data);
      } catch {
        setError('Error fetching projects');
      }
    })();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      fontFamily: 'sans-serif'
    }}>
      <h1>Project</h1>
      {error && <label>{error}</label>}
      <Grid columns={columns} rows={projects} />
    </div>
  );
}
