import { useEffectOnce } from '../util/util-main.ts';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';

export default function Dynamic() {
  const { load } = useGridStore();

  // The server redirects to the Sign In page if the user isn't signed in (or the session expired).
  useEffectOnce(() => {
    void load('dynamic');
  }, [load]);

  return (
    <div className={container}>
      <h1>Dynamic</h1>
      <Grid path={[0]} />
    </div>
  );
}
