import { useEffect, useState } from 'react';
import { Grid, type GridDto } from './util/util-grid.ts';

interface Grid2Props {
  grid: Grid;
  areaIndex: number;
}

export default function Grid2({ grid, areaIndex }: Grid2Props) {
  const [gridDto, setGridDto] = useState<GridDto>(grid.gridDto);

  useEffect(() => {
    (async () => {
      setGridDto(await grid.load());
    })();
  }, [grid]);

  const gridRows = gridDto.gridAreas?.[areaIndex]?.gridRows ?? [];

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
