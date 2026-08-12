import { useEffect, useState } from 'react';
import Grid from '../Grid.tsx';
import { Grid as GridModel, type GridDto } from '../util/util-grid.ts';

export default function Project() {
  const [grid] = useState(() => new GridModel('project'));
  const [gridDto, setGridDto] = useState<GridDto>(grid.gridDto);

  useEffect(() => {
    (async () => {
      setGridDto(await grid.load());
    })();
  }, [grid]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      fontFamily: 'sans-serif'
    }}>
      <h1>Project</h1>
      <Grid gridDto={gridDto} gridAreaName="main" />
      <Grid gridDto={gridDto} gridAreaName="user" />
    </div>
  );
}
