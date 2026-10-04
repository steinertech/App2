import { useEffect } from 'react';
import Grid from '../Grid.tsx';
import { resolveGrid, useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';

export default function Project() {
  const { gridPlaneDto, load } = useGridStore();

  useEffect(() => {
    void load('project');
  }, [load]);

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
    </div>
  );
}
