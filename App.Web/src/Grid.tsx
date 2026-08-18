import { useState, type ReactNode } from 'react';
import { useGridStore } from './GridStore.tsx';
import { buttonPrimaryClassName } from './style.ts';
import {
  GridCellEnum,
  GridCommandEnum,
  GridCustomEnum,
  type GridCellDto,
  type GridCommandDto,
  type GridCustomDto,
} from '../../App.Server/dto/web/grid-dto.ts';

interface GridProps {
  gridIndex: number;
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

export default function Grid({ gridIndex }: GridProps) {
  const { gridDto, sendCommand } = useGridStore();

  const gridArea = gridDto.areas?.[gridIndex];
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

    await sendCommand(gridIndex, { command: gridCommand });
  };

  const handleHeaderClick = async (gridCell: GridCellDto) => {
    if (gridCell.columnName === undefined) {
      return;
    }
    const gridCommand: GridCommandDto = { commandEnum: GridCommandEnum.SortClick, columnName: gridCell.columnName };
    await sendCommand(gridIndex, { command: gridCommand });
  };

  const handleReloadClick = async () => {
    await sendCommand(gridIndex, { command: { commandEnum: GridCommandEnum.Reload } });
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
      <button type="button" onClick={() => void handleReloadClick()} className={`${buttonPrimaryClassName} mt-2`}>
        Reload
      </button>
    </div>
  );
}
