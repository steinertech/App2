import { useEffect, useState } from 'react';
import { Grid as GridModel, type GridDto } from './util/util-grid.ts';

interface GridProps {
  grid: GridModel;
  gridAreaName: string;
}

export default function Grid({ grid, gridAreaName }: GridProps) {
  const [gridDto, setGridDto] = useState<GridDto>(grid.gridDto);

  useEffect(() => {
    (async () => {
      setGridDto(await grid.load());
    })();
  }, [grid]);

  const gridRows = gridDto.gridAreas?.[gridAreaName]?.gridRows ?? [];

  return (
    <table style={{ borderCollapse: 'collapse', fontFamily: 'sans-serif' }}>
      <tbody>
        {gridRows.map((gridRow, rowIndex) => (
          <tr key={rowIndex}>
            {(gridRow.gridCells ?? []).map((gridCell, cellIndex) => (
              <td key={cellIndex} style={{ border: '1px solid #ccc', padding: '8px' }}>
                {gridCell.text}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
