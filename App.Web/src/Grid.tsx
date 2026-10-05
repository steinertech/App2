import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { addAlert, apiFetch, getIsProgress, setIsProgress } from './util/util-main.ts';
import { AlertEnum } from '../../App.Server/dto/shared/alert-dto.ts';
import { resolveGrid, useGridStore } from './GridStore.tsx';
import { buttonGridClassName, buttonPrimaryClassName } from './style.ts';
import {
  GridCellEnum,
  GridCommandEnum,
  GridCustomEnum,
  type GridCellDto,
  type GridCommandDto,
  type GridCustomDto,
  type GridCustomModifyDto,
  type GridDto,
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
  if (gridCell.cellEnum === GridCellEnum.Search || gridCell.cellEnum === GridCellEnum.Empty) {
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
  gridVersion: number,
  onCustomClick: (gridCustom: GridCustomDto, pathIndex?: number) => void,
  onCustomTextChange: (gridCustom: GridCustomDto, textModified: string) => void,
  pathSegments: GridPathSegmentDto[],
): ReactNode {
  if (gridCustom.customEnum === GridCustomEnum.Edit) {
    return (
      <input
        key={`${key}-${gridVersion}`}
        type="text"
        defaultValue={gridCustom.text}
        onChange={(event) => onCustomTextChange(gridCustom, event.target.value)}
      />
    );
  }
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
  if (gridCustom.customEnum === GridCustomEnum.Image) {
    return <img key={key} src={gridCustom.imageUrl} alt={gridCustom.text ?? ''} className="max-w-full" />;
  }
  return null;
}

function gridCellContent(
  gridCell: GridCellDto,
  gridVersion: number,
  onCustomClick: (gridCustom: GridCustomDto, pathIndex?: number) => void,
  onCustomTextChange: (gridCustom: GridCustomDto, textModified: string) => void,
  onTextChange: (gridCell: GridCellDto, textModified: string) => void,
  onSelectMultiChange: (rowIndex: number, checked: boolean) => void,
  isSelectedMulti: boolean[],
  pathSegments: GridPathSegmentDto[],
): ReactNode {
  let content: ReactNode;
  if (gridCell.cellEnum === GridCellEnum.Custom) {
    content = (gridCell.customs ?? []).map((gridCustom, index) =>
      gridCustomContent(gridCustom, index, gridVersion, onCustomClick, onCustomTextChange, pathSegments),
    );
  } else if (gridCell.cellEnum === GridCellEnum.Empty) {
    content = null;
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
  } else if (gridCell.cellEnum === GridCellEnum.Label) {
    content = gridCell.text;
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
  const [customModifies, setCustomModifies] = useState<GridCustomModifyDto[]>(grid?.customModifies ?? []);
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

  const handleCustomTextChange = (gridCustom: GridCustomDto, textModified: string) => {
    setCustomModifies((prev) => {
      const filtered = prev.filter(
        (customModify) => !(customModify.customName === gridCustom.name && customModify.rowIndex === gridCustom.rowIndex),
      );

      if ((gridCustom.text ?? '') === textModified) {
        return filtered;
      }

      const customModify: GridCustomModifyDto = { textModified };
      if (gridCustom.name !== undefined) {
        customModify.customName = gridCustom.name;
      }
      if (gridCustom.rowIndex !== undefined) {
        customModify.rowIndex = gridCustom.rowIndex;
      }
      if (gridCustom.text !== undefined) {
        customModify.text = gridCustom.text;
      }

      return [...filtered, customModify];
    });
  };

  /** Sends a command with the current customModifies. Afterwards the GridCustomEnum.Edit inputs are re-rendered from GridCustomDto.text (gridVersion changes), so customModifies is cleared. */
  const sendGridCommand = async (override: GridDto) => {
    await sendCommand(path, { ...override, customModifies });
    setCustomModifies([]);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const selectedFiles = Array.from(input.files ?? []);
    input.value = ''; // Allow selecting the same files again.
    if (selectedFiles.length === 0) {
      return;
    }

    // Keep the progress bar shown until every file is uploaded to blob storage (not an /api call, so not counted by apiFetch).
    setIsProgress(getIsProgress() + 1);
    try {
      const storageUploadCollectionDto: StorageUploadCollectionDto = {
        path: gridStatePath(grid?.state),
        files: selectedFiles.map((file) => ({ fileName: file.name })),
      };
      const response = await apiFetch('storage-upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(storageUploadCollectionDto),
      });
      if (!response.ok) {
        return; // apiFetch already showed an Error alert.
      }
      const storageUploadCollection = (await response.json()) as StorageUploadCollectionDto;

      // Upload every selected file directly to blob storage via its presigned fileUrl.
      await Promise.all(
        (storageUploadCollection.files ?? []).map(async (storageUpload, index) => {
          const file = selectedFiles[index];
          if (storageUpload.fileUrl === undefined || file === undefined) {
            return;
          }
          // Not an /api call, so apiFetch doesn't report a failure (e.g. file too large, expired fileUrl); report it here.
          try {
            const uploadResponse = await fetch(storageUpload.fileUrl, { method: 'PUT', body: file });
            if (!uploadResponse.ok) {
              addAlert(AlertEnum.Error, `Upload of ${file.name} failed (${uploadResponse.status})`);
            }
          } catch {
            addAlert(AlertEnum.Error, `Upload of ${file.name} failed (no response from storage)`);
          }
        }),
      );

      await handleReloadClick();
    } finally {
      setIsProgress(getIsProgress() - 1);
    }
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

    await sendGridCommand({ command: gridCommand });
  };

  const handleHeaderClick = async (gridCell: GridCellDto) => {
    if (gridCell.columnName === undefined) {
      return;
    }
    const gridCommand: GridCommandDto = { commandEnum: GridCommandEnum.SortClick, columnName: gridCell.columnName };
    await sendGridCommand({ command: gridCommand });
  };

  const handleReloadClick = async () => {
    await sendGridCommand({ command: { commandEnum: GridCommandEnum.Reload } });
  };

  const handleRowSelect = async (rowIndex: number) => {
    if (rowIndex === rowIndexSelected) {
      return;
    }
    setRowIndexSelected(rowIndex);
    if (grid?.setting?.isSelectReload === true) {
      await sendGridCommand({ command: { commandEnum: GridCommandEnum.Reload, rowIndex }, state: { ...grid.state, selected: rowIndex } });
    }
  };

  const handleSaveClick = async () => {
    await sendGridCommand({ command: { commandEnum: GridCommandEnum.Save }, modifies });
    // Saved: clear modifies so the next Save doesn't send (and e.g. insert) them again.
    setModifies([]);
  };

  const handleNewClick = async () => {
    await sendGridCommand({ command: { commandEnum: GridCommandEnum.New }, modifies });
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => void handleFileChange(event)} />
      <h1 className="text-4xl font-bold">{grid?.setting?.title}</h1>
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
                      void handleRowSelect(gridCell.rowIndex);
                    }
                  }}
                >
                  {gridCellContent(
                    gridCell,
                    gridVersion,
                    (gridCustom, pathIndex) => handleCustomClick(gridCell, gridCustom, pathIndex),
                    handleCustomTextChange,
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
    </div>
  );
}
