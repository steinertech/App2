import { useState, type ReactNode } from 'react';
import { useGridStore } from './GridStore.tsx';
import { buttonGridClassName, buttonPrimaryClassName } from './style.ts';
import {
  GridCellEnum,
  GridCommandEnum,
  GridCustomEnum,
  type GridCellDto,
  type GridCommandDto,
  type GridCustomDto,
  type GridDto,
  type GridModifyDto,
} from '../../App.Server/dto/web/grid-dto.ts';

interface GridProps {
  /**
   * Address of this GridDto within the recursive GridPageDto tree: [gridIndex] for a
   * root grid, or [gridIndex, pagesIndex, gridIndex, pagesIndex, ...] to reach a GridDto
   * nested under GridDto.pages (e.g. a confirmation dialog opened by a parent grid).
   */
  path: number[];
}

function resolveGrid(rootPage: GridDto[] | undefined, path: number[]): GridDto | undefined {
  const [gridIndex, pagesIndex, nestedGridIndex, ...rest] = path;
  if (gridIndex === undefined) {
    return undefined;
  }
  const grid = rootPage?.[gridIndex];
  if (pagesIndex === undefined || nestedGridIndex === undefined) {
    return grid;
  }
  return resolveGrid(grid?.pages?.[pagesIndex]?.page, [nestedGridIndex, ...rest]);
}

function gridCellClassName(gridCell: GridCellDto, rowSelected: boolean): string {
  if (gridCell.cellEnum === GridCellEnum.Header) {
    return 'font-bold text-white bg-blue-600';
  }
  if (gridCell.cellEnum === GridCellEnum.Search) {
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
      <button key={key} type="button" onClick={() => onCustomClick(gridCustom)} className={buttonGridClassName}>
        {gridCustom.text}
      </button>
    );
  }
  if (gridCustom.customEnum === GridCustomEnum.Label) {
    return <span key={key}>{gridCustom.text}</span>;
  }
  return null;
}

function gridCellContent(
  gridCell: GridCellDto,
  gridVersion: number,
  onCustomClick: (gridCustom: GridCustomDto) => void,
  onTextChange: (gridCell: GridCellDto, textModified: string) => void,
  onSelectMultiChange: (rowIndex: number, checked: boolean) => void,
  isSelectedMulti: boolean[],
): ReactNode {
  let content: ReactNode;
  if (gridCell.cellEnum === GridCellEnum.Custom) {
    content = (gridCell.customs ?? []).map((gridCustom, index) => gridCustomContent(gridCustom, index, onCustomClick));
  } else if (gridCell.cellEnum === GridCellEnum.Empty) {
    content = 'Empty';
  } else if (gridCell.cellEnum === GridCellEnum.Edit) {
    content = (
      <input
        key={gridVersion}
        type="text"
        placeholder={gridCell.placeHolder}
        defaultValue={gridCell.text}
        onChange={(event) => onTextChange(gridCell, event.target.value)}
        className="w-full"
      />
    );
  } else if (gridCell.cellEnum === GridCellEnum.Search) {
    content = <input key={gridVersion} type="text" placeholder={gridCell.placeHolder} defaultValue={gridCell.text} className="w-full" />;
  } else if (gridCell.cellEnum === GridCellEnum.Header) {
    const arrow = gridCell.isSortAsc === true ? ' ↑' : gridCell.isSortAsc === false ? ' ↓' : '';
    content = `${gridCell.text ?? ''}${arrow}`;
  } else {
    content = gridCell.text;
  }

  if (gridCell.isSelectMulti && gridCell.rowIndex !== undefined) {
    const rowIndex = gridCell.rowIndex;
    return (
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSelectedMulti[rowIndex] ?? false}
          onChange={(event) => onSelectMultiChange(rowIndex, event.target.checked)}
        />
        <span className="flex-1">{content}</span>
      </span>
    );
  }

  return content;
}

export default function Grid({ path }: GridProps) {
  const { gridPageDto, gridVersion, sendCommand } = useGridStore();

  const grid = resolveGrid(gridPageDto.page, path);
  const gridRows = grid?.rows ?? [];
  const [rowIndexSelected, setRowIndexSelected] = useState(grid?.state?.selected);
  const [modifies, setModifies] = useState<GridModifyDto[]>(grid?.modifies ?? []);
  const [isSelectedMulti, setIsSelectedMulti] = useState<boolean[]>(grid?.state?.isSelectedMulti ?? []);

  const handleSelectMultiChange = (rowIndex: number, checked: boolean) => {
    setIsSelectedMulti((prev) => {
      const next = [...prev];
      next[rowIndex] = checked;
      return next;
    });
  };

  const handleTextChange = (gridCell: GridCellDto, textModified: string) => {
    setModifies((prev) => {
      const filtered = prev.filter(
        (modify) =>
          !(modify.cellEnum === gridCell.cellEnum && modify.columnName === gridCell.columnName && modify.rowIndex === gridCell.rowIndex),
      );

      if (gridCell.text === textModified) {
        return filtered;
      }

      const modify: GridModifyDto = { textModified };
      if (gridCell.cellEnum !== undefined) {
        modify.cellEnum = gridCell.cellEnum;
      }
      if (gridCell.columnName !== undefined) {
        modify.columnName = gridCell.columnName;
      }
      if (gridCell.rowIndex !== undefined) {
        modify.rowIndex = gridCell.rowIndex;
      }
      if (gridCell.text !== undefined) {
        modify.text = gridCell.text;
      }
      if (gridCell.isNew !== undefined) {
        modify.isNew = gridCell.isNew;
      }

      return [...filtered, modify];
    });
  };

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

    await sendCommand(path, { command: gridCommand, state: { ...grid?.state, isSelectedMulti } });
  };

  const handleHeaderClick = async (gridCell: GridCellDto) => {
    if (gridCell.columnName === undefined) {
      return;
    }
    const gridCommand: GridCommandDto = { commandEnum: GridCommandEnum.SortClick, columnName: gridCell.columnName };
    await sendCommand(path, { command: gridCommand });
  };

  const handleReloadClick = async () => {
    await sendCommand(path, { command: { commandEnum: GridCommandEnum.Reload } });
  };

  const handleSaveClick = async () => {
    await sendCommand(path, { command: { commandEnum: GridCommandEnum.Save }, modifies });
  };

  const handleNewClick = async () => {
    await sendCommand(path, { command: { commandEnum: GridCommandEnum.New }, modifies });
  };

  return (
    <div>
      <h1 className="text-4xl font-bold">{grid?.text}</h1>
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
                  {gridCellContent(
                    gridCell,
                    gridVersion,
                    (gridCustom) => handleCustomClick(gridCell, gridCustom),
                    handleTextChange,
                    handleSelectMultiChange,
                    isSelectedMulti,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => void handleReloadClick()} className={`${buttonPrimaryClassName} mt-2`}>
        Reload
      </button>
      <button type="button" onClick={() => void handleSaveClick()} className={`${buttonPrimaryClassName} mt-2 ml-2`}>
        Save
      </button>
      <button type="button" onClick={() => void handleNewClick()} className={`${buttonPrimaryClassName} mt-2 ml-2`}>
        New
      </button>
      {(grid?.pages ?? []).map((gridPage, pagesIndex) => (
        <div key={pagesIndex} className="mt-4 border-l-2 border-gray-300 pl-4">
          {(gridPage.page ?? []).map((_, gridIndex) => (
            <Grid key={gridIndex} path={[...path, pagesIndex, gridIndex]} />
          ))}
        </div>
      ))}
    </div>
  );
}
