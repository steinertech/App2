import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import Project from './page/Project.tsx';
import { apiUrl } from './page/App.tsx';
import { resolveGrid, useGridStore } from './GridStore.tsx';
import { buttonGridClassName, buttonPrimaryClassName } from './style.ts';
import {
  GridCellEnum,
  GridCommandEnum,
  GridCustomEnum,
  type GridCellDto,
  type GridCommandDto,
  type GridCustomDto,
  type GridModifyDto,
  type GridPathSegmentDto,
  gridStatePath,
} from '../../App.Server/dto/shared/grid-dto.ts';
import type { StorageUploadCollectionDto } from '../../App.Server/dto/shared/storage-upload-dto.ts';

interface GridProps {
  /**
   * Address of this GridDto within the recursive GridPlaneDto tree: [gridIndex] for a
   * root grid, or [gridIndex, planesIndex, gridIndex, planesIndex, ...] to reach a GridDto
   * nested under GridDto.planes (e.g. a confirmation dialog opened by a parent grid).
   */
  path: number[];
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

function gridCustomContent(
  gridCustom: GridCustomDto,
  key: number,
  onCustomClick: (gridCustom: GridCustomDto, pathIndex?: number) => void,
  pathSegments: GridPathSegmentDto[],
): ReactNode {
  if (gridCustom.customEnum === GridCustomEnum.Path) {
    return (
      <nav key={key} className="inline-flex items-center gap-1">
        <button type="button" onClick={() => onCustomClick(gridCustom, -1)} className="text-blue-600 hover:underline">
          Root
        </button>
        {pathSegments.map((pathSegment, pathIndex) => (
          <span key={pathIndex} className="inline-flex items-center gap-1">
            <span>/</span>
            <button type="button" onClick={() => onCustomClick(gridCustom, pathIndex)} className="text-blue-600 hover:underline">
              {pathSegment.text}
            </button>
          </span>
        ))}
      </nav>
    );
  }
  if (gridCustom.customEnum === GridCustomEnum.Button || gridCustom.customEnum === GridCustomEnum.ButtonUpload) {
    return (
      <button
        key={key}
        type="button"
        disabled={gridCustom.isDisabled === true}
        onClick={() => onCustomClick(gridCustom)}
        className={buttonGridClassName}
      >
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
  onCustomClick: (gridCustom: GridCustomDto, pathIndex?: number) => void,
  onTextChange: (gridCell: GridCellDto, textModified: string) => void,
  onSelectMultiChange: (rowIndex: number, checked: boolean) => void,
  isSelectedMulti: boolean[],
  pathSegments: GridPathSegmentDto[],
): ReactNode {
  let content: ReactNode;
  if (gridCell.cellEnum === GridCellEnum.Custom) {
    content = (gridCell.customs ?? []).map((gridCustom, index) => gridCustomContent(gridCustom, index, onCustomClick, pathSegments));
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
  const { gridPlaneDto, gridVersion, sendCommand, sendPatch } = useGridStore();

  const grid = resolveGrid(gridPlaneDto.grids, path);
  const gridRows = grid?.rows ?? [];
  const [rowIndexSelected, setRowIndexSelected] = useState(grid?.state?.selected);
  const [modifies, setModifies] = useState<GridModifyDto[]>(grid?.modifies ?? []);
  // Read from the store (not local state) so it follows server changes, e.g. cleared after DeleteMulti.
  const isSelectedMulti = grid?.state?.isSelectedMulti ?? [];

  const handleSelectMultiChange = async (rowIndex: number, checked: boolean) => {
    const next = [...isSelectedMulti];
    next[rowIndex] = checked;

    const gridCommand: GridCommandDto = { commandEnum: GridCommandEnum.MultiClick, rowIndex };
    await sendPatch(path, { command: gridCommand, state: { ...grid?.state, isSelectedMulti: next } });
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const selectedFiles = Array.from(input.files ?? []);
    input.value = ''; // Allow selecting the same files again.
    if (selectedFiles.length === 0) {
      return;
    }

    const storageUploadCollectionDto: StorageUploadCollectionDto = {
      path: gridStatePath(grid?.state),
      files: selectedFiles.map((file) => ({ fileName: file.name })),
    };
    const response = await fetch(`${apiUrl}storage-upload2`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(storageUploadCollectionDto),
    });
    const storageUploadCollection = (await response.json()) as StorageUploadCollectionDto;

    // Upload every selected file directly to blob storage via its presigned fileUrl.
    await Promise.all(
      (storageUploadCollection.files ?? []).map(async (storageUpload, index) => {
        const file = selectedFiles[index];
        if (storageUpload.fileUrl === undefined || file === undefined) {
          return;
        }
        await fetch(storageUpload.fileUrl, { method: 'PUT', body: file });
      }),
    );

    await handleReloadClick();
  };

  const handleCustomClick = async (gridCell: GridCellDto, gridCustom: GridCustomDto, pathIndex?: number) => {
    if (gridCustom.customEnum === GridCustomEnum.ButtonUpload) {
      fileInputRef.current?.click();
      return;
    }

    const gridCommand: GridCommandDto = { commandEnum: GridCommandEnum.CustomButtonClick };
    if (gridCustom.rowIndex !== undefined) {
      gridCommand.rowIndex = gridCustom.rowIndex;
    }
    if (pathIndex !== undefined) {
      gridCommand.pathIndex = pathIndex;
    }
    if (gridCell.columnName !== undefined) {
      gridCommand.columnName = gridCell.columnName;
    }
    if (gridCustom.name !== undefined) {
      gridCommand.customName = gridCustom.name;
    }

    await sendCommand(path, { command: gridCommand });
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
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => void handleFileChange(event)} />
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
                    (gridCustom, pathIndex) => handleCustomClick(gridCell, gridCustom, pathIndex),
                    handleTextChange,
                    handleSelectMultiChange,
                    isSelectedMulti,
                    grid?.state?.pathSegments ?? [],
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
      {grid?.planes !== undefined && grid.planes.length > 0 && (
        <div className="mt-4 border-l-2 border-gray-300 pl-4">
          <Project path={[...path, 0]} />
        </div>
      )}
    </div>
  );
}
