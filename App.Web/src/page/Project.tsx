import { useEffect, useState } from 'react';
import Grid from '../Grid.tsx';
import { resolveGrid, useGridStore, type GridPlaneDto } from '../GridStore.tsx';
import { container } from '../style.ts';
import { apiUrl } from './App.tsx';

export default function Project() {
  const { gridPlaneDto, load } = useGridStore();
  const [storageJson, setStorageJson] = useState('');

  useEffect(() => {
    void load('project');
  }, [load]);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const response = await fetch(`${apiUrl}grid-load`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ planeName: 'storage', grids: [] } satisfies GridPlaneDto),
        });
        const data = (await response.json()) as GridPlaneDto;
        setStorageJson(JSON.stringify(data, null, 2).replace(/\s+/g, ' ').trim());
      } catch {
        setStorageJson('Error fetching storage');
      }
    };

    void loadStorage();
  }, []);

  // Confirmation dialog, opened by the server at GridPlaneDto.grids[0].planes[0].grids[0].
  const confirmPath = [0, 0, 0];
  const isConfirm = resolveGrid(gridPlaneDto.grids, confirmPath) !== undefined;

  return (
    <div className={container}>
      <h1>Project</h1>
      <Grid path={[0]} />
      <Grid path={[1]} />
      {isConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Grid path={confirmPath} />
          </div>
        </div>
      )}
      <p className="mt-4 break-words">{storageJson}</p>
    </div>
  );
}
