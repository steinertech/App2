import { useEffectOnce } from '../util/util-main.ts';
import Grid from '../Grid.tsx';
import { resolveGrid, useGridStore } from '../GridStore.tsx';
import { sidebarRightClassName } from '../style.ts';

export default function Design() {
  const { gridPlaneDto, load } = useGridStore();

  // The server redirects to the Sign In page if the user isn't signed in (or the session expired).
  useEffectOnce(() => {
    void load('design');
  }, [load]);

  // Delete confirmation, opened by the server at GridPlaneDto.grids[0].planes[1].grids[0] (Design Band) or grids[3].planes[1].grids[0] (Design Master Detail).
  const modalPath = [[0, 1, 0], [3, 1, 0]].find((path) => resolveGrid(gridPlaneDto.grids, path) !== undefined);

  return (
    <div>
      <h1>Design</h1>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1">
          <Grid path={[0]} />
          <Grid path={[3]} />
          <Grid path={[2]} />
        </div>
        {/* Properties of the selected band. */}
        <aside className={sidebarRightClassName}>
          <Grid path={[1]} />
        </aside>
      </div>
      {modalPath !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Grid path={modalPath} />
          </div>
        </div>
      )}
    </div>
  );
}
