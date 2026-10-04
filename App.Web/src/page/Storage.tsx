import { useEffectOnce } from '../util/util-main.ts';
import Grid from '../Grid.tsx';
import { resolveGrid, useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';

export default function Storage() {
  const { gridPlaneDto, load } = useGridStore();

  useEffectOnce(() => {
    void load('storage');
  }, [load]);

  // Dialog (Delete confirmation or New Folder), opened by the server at GridPlaneDto.grids[0].planes[0].grids[0].
  const modalPath = [0, 0, 0];
  const isModal = resolveGrid(gridPlaneDto.grids, modalPath) !== undefined;

  return (
    <div className={container}>
      <h1>Storage</h1>
      <Grid path={[0]} />
      {/* Image Preview of the selected row, only returned by the server for a .jpg or .png file. */}
      {gridPlaneDto.grids?.[1] !== undefined && <Grid path={[1]} />}
      {isModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Grid path={modalPath} />
          </div>
        </div>
      )}
    </div>
  );
}
