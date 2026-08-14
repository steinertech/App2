import type { CSSProperties, ReactNode } from 'react';
import type { GridDto } from './util/util-grid.ts';
import { GridCellEnum, GridCustomEnum, type GridCellDto, type GridCustomDto } from '../../App.Server/dto/web/grid-dto.ts';

interface GridProps {
  gridDto: GridDto;
  gridAreaName: string;
}

function gridCellStyle(gridCell: GridCellDto): CSSProperties {
  const style: CSSProperties = { border: '1px solid #ccc', padding: '8px' };
  if (gridCell.gridCellEnum === GridCellEnum.Header) {
    style.fontWeight = 'bold';
    style.color = '#fff';
    style.backgroundColor = '#add8e6';
  }
  return style;
}

function gridCustomContent(gridCustom: GridCustomDto, key: number): ReactNode {
  if (gridCustom.gridCustomEnum === GridCustomEnum.Button) {
    return (
      <button key={key} type="button">
        {gridCustom.text}
      </button>
    );
  }
  return null;
}

function gridCellContent(gridCell: GridCellDto): ReactNode {
  if (gridCell.gridCellEnum === GridCellEnum.Custom) {
    return (gridCell.gridCustoms ?? []).map((gridCustom, index) => gridCustomContent(gridCustom, index));
  }
  return gridCell.text;
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
                  {gridCellContent(gridCell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
