import { useState } from 'react';
import Grid from '../Grid.tsx';
import { Grid as GridModel } from '../util/util-grid.ts';

export default function Project() {
  const [grid] = useState(() => new GridModel('project'));

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
      <Grid grid={grid} gridAreaName="main" />
    </div>
  );
}
