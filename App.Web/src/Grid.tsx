import { useEffect, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridDto } from './util/util-grid.ts';
import { buttonPrimaryClassName } from './style.ts';
import {
  GridCellEnum,
  GridCommandEnum,
  GridCustomEnum,
  type GridAreaDto,
  type GridCellDto,
  type GridCommandDto,
  type GridCustomDto,
} from '../../App.Server/dto/web/grid-dto.ts';

interface GridProps {
  gridDto: GridDto;
  gridName: string;
}

function gridCellClassName(gridCell: GridCellDto, rowSelected: boolean): string {
  if (gridCell.cellEnum === GridCellEnum.Header) {
    return 'font-bold text-white bg-blue-600';
  }
  if (gridCell.cellEnum === GridCellEnum.Find) {
    return 'bg-blue-50';
  }
  if (rowSelected) {
    return 'bg-blue-100';
  }
  return '';
}

function gridCustomContent(gridCustom: GridCustomDto, key: number, onCustomClick: (gridCustom: GridCustomDto) => void): ReactNode {
  if (gridCustom.customEnum === GridCustomEnum.Button) {
    return (
      <button key={key} type="button" onClick={() => onCustomClick(gridCustom)} className={buttonPrimaryClassName}>
        {gridCustom.text}
      </button>
    );
  }
  return null;
}

function gridCellContent(gridCell: GridCellDto, onCustomClick: (gridCustom: GridCustomDto) => void): ReactNode {
  if (gridCell.cellEnum === GridCellEnum.Custom) {
    return (gridCell.customs ?? []).map((gridCustom, index) => gridCustomContent(gridCustom, index, onCustomClick));
  }
  if (gridCell.cellEnum === GridCellEnum.Empty) {
    return 'Empty';
  }
  if (gridCell.cellEnum === GridCellEnum.Find || gridCell.cellEnum === GridCellEnum.Text) {
    return <input type="text" placeholder={gridCell.placeHolder} defaultValue={gridCell.text} className="w-full" />;
  }
  if (gridCell.cellEnum === GridCellEnum.Header) {
    const arrow = gridCell.isSortAsc === true ? ' ↑' : gridCell.isSortAsc === false ? ' ↓' : '';
    return `${gridCell.text ?? ''}${arrow}`;
  }
  return gridCell.text;
}

export default function Grid({ gridDto: gridDtoProp, gridName }: GridProps) {
  const [gridDto, setGridDto] = useState(gridDtoProp);
  useEffect(() => setGridDto(gridDtoProp), [gridDtoProp]);

  const gridArea = gridDto.areas?.find((area) => area.gridName === gridName);
  const gridRows = gridArea?.rows ?? [];
  const [rowIndexSelected, setRowIndexSelected] = useState(gridArea?.state?.rowIndexSelected);

  const handleCustomClick = async (gridCell: GridCellDto, gridCustom: GridCustomDto) => {
    const gridCommand: GridCommandDto = { commandEnum: GridCommandEnum.CustomButtonClick };
    if (gridCustom.rowIndex !== undefined) {
      gridCommand.rowIndex = gridCustom.rowIndex;
    }
    if (gridCell.columnName !== undefined) {
      gridCommand.columnName = gridCell.columnName;
    }
    if (gridCustom.name !== undefined) {
      gridCommand.customName = gridCustom.name;
    }

    const area: GridAreaDto = { gridName, command: gridCommand };
    if (gridArea?.rowKeys !== undefined) {
      area.rowKeys = gridArea.rowKeys;
    }
    const body: GridDto = { areas: [area] };

    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setGridDto(await response.json());
  };

  const handleHeaderClick = async (gridCell: GridCellDto) => {
    if (gridCell.columnName === undefined) {
      return;
    }
    const gridCommand: GridCommandDto = { commandEnum: GridCommandEnum.SortClick, columnName: gridCell.columnName };

    const area: GridAreaDto = { gridName, command: gridCommand };
    if (gridArea?.rowKeys !== undefined) {
      area.rowKeys = gridArea.rowKeys;
    }
    if (gridArea?.state !== undefined) {
      area.state = gridArea.state;
    }
    const body: GridDto = { areas: [area] };

    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setGridDto(await response.json());
  };

  return (
    <div>
      <h1 className="text-4xl font-bold">{gridArea?.text}</h1>
      <table className="w-full">
        <tbody>
          {gridRows.map((gridRow, rowIndex) => (
            <tr key={rowIndex}>
              {(gridRow.cells ?? []).map((gridCell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={gridCellClassName(gridCell, gridCell.rowIndex !== undefined && gridCell.rowIndex === rowIndexSelected)}
                  onClick={() => {
                    if (gridCell.cellEnum === GridCellEnum.Header) {
                      void handleHeaderClick(gridCell);
                    } else if (gridCell.rowIndex !== undefined) {
                      setRowIndexSelected(gridCell.rowIndex);
                    }
                  }}
                >
                  {gridCellContent(gridCell, (gridCustom) => handleCustomClick(gridCell, gridCustom))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
