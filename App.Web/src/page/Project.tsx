import { useEffect } from 'react';
import Grid from '../Grid.tsx';
import { useStore } from '../Store.tsx';
import { container } from '../style.ts';

export default function Project() {
  const { gridDto, load } = useStore();

  useEffect(() => {
    void load(['project', 'user']);
  }, [load]);

  return (
    <div className={container}>
      <h1>Project</h1>
      <Grid gridDto={gridDto} gridName="project" />
      <Grid gridDto={gridDto} gridName="user" />
    </div>
  );
}
