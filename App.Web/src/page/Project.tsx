import { useEffect } from 'react';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';

export default function Project() {
  const { load } = useGridStore();

  useEffect(() => {
    void load('project');
  }, [load]);

  return (
    <div className={container}>
      <h1>Project</h1>
      <Grid path={[0]} />
      <Grid path={[1]} />
    </div>
  );
}
