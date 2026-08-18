import { useEffect } from 'react';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';

export default function Storage() {
  const { gridDto, load } = useGridStore();

  useEffect(() => {
    void load(['storage']);
  }, [load]);

  return (
    <div className={container}>
      <h1>Storage</h1>
      <Grid gridDto={gridDto} gridName="storage" />
    </div>
  );
}
