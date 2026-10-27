import { useEffectOnce } from '../util/util-main.ts';
import Grid from '../Grid.tsx';
import { resolveGrid, useGridStore } from '../GridStore.tsx';

// Subpage of Debug.
export default function DebugDynamic() {
  const { gridPlaneDto, load } = useGridStore();

  useEffectOnce(() => {
    void load('debugDynamic');
  }, [load]);

  // Delete confirmation, opened by the server at GridPlaneDto.grids[0].planes[1].grids[0].
  const modalPath = [0, 1, 0];
  const isModal = resolveGrid(gridPlaneDto.grids, modalPath) !== undefined;

  return (
    <div>
      <h1>Debug Dynamic</h1>
      <div className="mt-4">
        <Grid path={[0]} />
      </div>
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
