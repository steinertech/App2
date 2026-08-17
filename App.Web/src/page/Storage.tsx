import { useEffect, useState } from 'react';
import Grid from '../Grid.tsx';
import { Grid as GridModel, type GridDto } from '../util/util-grid.ts';

export default function Storage() {
  const [grid] = useState(() => new GridModel(['storage']));
  const [gridDto, setGridDto] = useState<GridDto>(grid.gridDto);

  useEffect(() => {
    (async () => {
      setGridDto(await grid.load());
    })();
  }, [grid]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1>Storage</h1>
      <Grid gridDto={gridDto} gridName="storage" />
    </div>
  );
}
