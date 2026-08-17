import { useEffect, useState } from 'react';
import Grid from '../Grid.tsx';
import { Grid as GridModel, type GridDto } from '../util/util-grid.ts';
import { container } from '../style.ts';

export default function Project() {
  const [grid] = useState(() => new GridModel(['project', 'user']));
  const [gridDto, setGridDto] = useState<GridDto>(grid.gridDto);

  useEffect(() => {
    (async () => {
      setGridDto(await grid.load());
    })();
  }, [grid]);

  return (
    <div className={container}>
      <h1>Project</h1>
      <Grid gridDto={gridDto} gridName="project" />
      <Grid gridDto={gridDto} gridName="user" />
    </div>
  );
}
