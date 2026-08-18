import { useEffect } from 'react';
import Grid from '../Grid.tsx';
import { useStore } from '../Store.tsx';
import { container } from '../style.ts';

export default function Storage() {
  const { gridDto, load } = useStore();

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
