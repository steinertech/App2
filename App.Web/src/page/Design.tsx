import { useEffectOnce } from '../util/util-main.ts';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { sidebarRightClassName } from '../style.ts';

export default function Design() {
  const { load } = useGridStore();

  // The server redirects to the Sign In page if the user isn't signed in (or the session expired).
  useEffectOnce(() => {
    void load('design');
  }, [load]);

  return (
    <div>
      <h1>Design</h1>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1">
          <Grid path={[0]} />
          <Grid path={[2]} />
        </div>
        {/* Properties of the selected band. */}
        <aside className={sidebarRightClassName}>
          <Grid path={[1]} />
        </aside>
      </div>
    </div>
  );
}
