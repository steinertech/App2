import { useEffectOnce } from '../util/util-main.ts';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';

export default function Schema() {
  const { load } = useGridStore();

  // The server redirects to the Sign In page if the user isn't signed in (or the session expired).
  useEffectOnce(() => {
    void load('schema');
  }, [load]);

  return (
    <div className={container}>
      <h1>Schema</h1>
      <Grid path={[0]} />
    </div>
  );
}
