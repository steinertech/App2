import { useEffect, useState } from 'react';
import Grid from '../Grid.tsx';
import { useGridStore, type GridPlaneDto } from '../GridStore.tsx';
import { container } from '../style.ts';
import { apiUrl } from './App.tsx';

interface ProjectProps {
  /** Address of this Project's grid pair within the recursive GridPlaneDto tree: [] at the root, or a path ending at a GridDto.planes entry when rendered recursively from Grid. */
  path?: number[];
}

export default function Project({ path = [] }: ProjectProps) {
  const { load } = useGridStore();
  const isRoot = path.length === 0;
  const [storageJson, setStorageJson] = useState('');

  useEffect(() => {
    if (isRoot) {
      void load('project');
    }
  }, [load, isRoot]);

  useEffect(() => {
    if (!isRoot) {
      return;
    }

    const loadStorage = async () => {
      try {
        const response = await fetch(`${apiUrl}grid`, {
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
  }, [isRoot]);

  const grids = (
    <>
      <Grid path={[...path, 0]} />
      <Grid path={[...path, 1]} />
    </>
  );

  if (!isRoot) {
    return grids;
  }

  return (
    <div className={container}>
      <h1>Project</h1>
      {grids}
      <p className="mt-4 break-words">{storageJson}</p>
    </div>
  );
}
