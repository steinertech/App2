import type { CSSProperties } from 'react';
import type { GridDto } from './util/util-grid.ts';
import { GridCellEnum, type GridCellDto } from '../../App.Server/dto/grid-dto.ts';

interface GridProps {
  gridDto: GridDto;
  gridAreaName: string;
}

function gridCellStyle(gridCell: GridCellDto): CSSProperties {
  const style: CSSProperties = { border: '1px solid #ccc', padding: '8px' };
  if (gridCell.gridCellEnum === GridCellEnum.Header) {
    style.color = '#fff';
    style.fontWeight = 'bold';
    style.backgroundColor = '#add8e6';
  }
  return style;
}

export default function Grid({ gridDto, gridAreaName }: GridProps) {
  const gridArea = gridDto.gridAreas?.[gridAreaName];
  const gridRows = gridArea?.gridRows ?? [];

  return (
    <div>
      <h1>{gridArea?.text}</h1>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'sans-serif' }}>
        <tbody>
          {gridRows.map((gridRow, rowIndex) => (
            <tr key={rowIndex}>
              {(gridRow.gridCells ?? []).map((gridCell, cellIndex) => (
                <td key={cellIndex} style={gridCellStyle(gridCell)}>
                  {gridCell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
