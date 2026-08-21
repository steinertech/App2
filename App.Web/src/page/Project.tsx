import { useEffect } from 'react';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';
import ProjectConfirm from './ProjectConfirm.tsx';

export default function Project() {
  const { load } = useGridStore();

  useEffect(() => {
    void load('project');
  }, [load]);

  return (
    <div className={container}>
      <h1>Project</h1>
      <Grid gridIndex={0} />
      <Grid gridIndex={1} />
      <ProjectConfirm />
    </div>
  );
}
