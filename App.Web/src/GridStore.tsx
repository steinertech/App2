import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiFetch } from './util/util-main.ts';
import { GridPatchEnum, type GridDto, type GridPlaneDto, type GridStateDto } from '../../App.Server/dto/shared/grid-dto.ts';

export type { GridPlaneDto };

export type GridOverride = GridDto;

interface GridOverrideEntry {
  /** Address of the target GridDto: [gridIndex] for a root grid, or [gridIndex, planesIndex, gridIndex, ...] for one nested under GridDto.planes. */
  path: number[];
  override: GridOverride;
}

interface GridStoreValue {
  gridPlaneDto: GridPlaneDto;
  gridVersion: number;
  /** Returns the loaded plane, or undefined if the server call failed (the store is kept as is). */
  load: (planeName: string) => Promise<GridPlaneDto | undefined>;
  /** Returns the reloaded plane, or undefined if the server call failed (the store is kept as is). */
  sendCommand: (path: number[], override: GridOverride) => Promise<GridPlaneDto | undefined>;
  /** Posts the plane with override applied at path to /api/grid-patch and applies the returned GridDto.patches to the loaded grids (rows aren't reloaded). override.state is also kept on the grid at path. */
  sendPatch: (path: number[], override: GridOverride) => Promise<GridPlaneDto>;
  /** Merges state into GridDto.state of the grid at path without a server call; it is sent with the next command. */
  setState: (path: number[], state: GridStateDto) => void;
  /** Closes the plane containing the nested grid at path (sets it to null in the parent's GridDto.planes) without a server call. No-op for a root grid. */
  closePlane: (path: number[]) => void;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

function samePath(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Finds the GridDto at path: [gridIndex] for a root grid, or [gridIndex, planesIndex, gridIndex, ...] for one nested under GridDto.planes. */
export function resolveGrid(rootGrids: GridDto[] | undefined, path: number[]): GridDto | undefined {
  const [gridIndex, planesIndex, nestedGridIndex, ...rest] = path;
  if (gridIndex === undefined) {
    return undefined;
  }
  const grid = rootGrids?.[gridIndex];
  if (planesIndex === undefined || nestedGridIndex === undefined) {
    return grid;
  }
  return resolveGrid(grid?.planes?.[planesIndex]?.grids,[nestedGridIndex, ...rest]);
}

/** Rebuilds a GridDto for sending to the server: strips tables, setting and patches (the server always recomputes them; title is kept and sent back) and, recursively, applies any override addressed at this node or one nested under it. */
function buildOutgoingGrid(existingGrid: GridDto, path: number[], entries: GridOverrideEntry[]): GridDto {
  const entry = entries.find((candidate) => samePath(candidate.path, path));
  const grid: GridDto = { ...existingGrid, ...entry?.override };
  delete grid.tables;
  delete grid.setting;
  delete grid.patches;

  if (grid.planes !== undefined) {
    grid.planes = grid.planes.map((gridPlane, planesIndex) =>
      gridPlane === null
        ? null
        : {
            ...gridPlane,
            grids: (gridPlane.grids ?? []).map((nestedGrid, gridIndex) => buildOutgoingGrid(nestedGrid, [...path, planesIndex, gridIndex], entries)),
          },
    );
  }

  return grid;
}

/**
 * Applies responseGrid.patches to grid, then recurses into planes (the response mirrors the request's structure):
 * GridPatchEnum.Button copies isDisabled onto each GridCustomDto whose name matches; GridPatchEnum.Lookup sets GridPatchDto.lookup as the only grid of grid.planes[0] (with GridPatchDto.planeName).
 */
function applyPatches(grid: GridDto, responseGrid: GridDto): void {
  for (const patch of responseGrid.patches ?? []) {
    if (patch.patchEnum === GridPatchEnum.Lookup) {
      const planes = [...(grid.planes ?? [])];
      planes[0] = patch.lookup !== undefined ? { ...(patch.planeName !== undefined && { planeName: patch.planeName }), grids: [patch.lookup] } : null;
      grid.planes = planes;
      continue;
    }
    if (patch.patchEnum !== GridPatchEnum.Button) {
      continue;
    }
    for (const row of (grid.tables ?? []).flatMap((table) => table.rows ?? [])) {
      for (const cell of row.cells ?? []) {
        for (const custom of cell.customs ?? []) {
          if (custom.name === patch.name) {
            if (patch.isDisabled !== undefined) {
              custom.isDisabled = patch.isDisabled;
            } else {
              delete custom.isDisabled;
            }
          }
        }
      }
    }
  }

  (grid.planes ?? []).forEach((gridPlane, planesIndex) => {
    (gridPlane?.grids ?? []).forEach((nestedGrid, gridIndex) => {
      const nestedResponseGrid = responseGrid.planes?.[planesIndex]?.grids?.[gridIndex];
      if (nestedResponseGrid !== undefined) {
        applyPatches(nestedGrid, nestedResponseGrid);
      }
    });
  });
}

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridPlaneDto, setGridPlaneDto] = useState<GridPlaneDto>({});
  const [gridVersion, setGridVersion] = useState(0);
  const gridPlaneDtoRef = useRef<GridPlaneDto>(gridPlaneDto);
  const planeNameRef = useRef<string | undefined>(undefined);
  const overridesRef = useRef<Map<string, GridOverrideEntry>>(new Map());

  const fetchPlane = useCallback(async (): Promise<GridPlaneDto | undefined> => {
    const entries = [...overridesRef.current.values()];
    overridesRef.current.clear();

    const grids: GridDto[] = (gridPlaneDtoRef.current.grids ?? []).map((existingGrid, gridIndex) =>
      buildOutgoingGrid(existingGrid, [gridIndex], entries),
    );

    const body: GridPlaneDto = { grids };
    if (planeNameRef.current !== undefined) {
      body.planeName = planeNameRef.current;
    }

    const response = await apiFetch('grid-load', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Error (e.g. not signed in): apiFetch already shows the alert; keep the store as is (the error body is not a GridPlaneDto).
    if (!response.ok) {
      return undefined;
    }
    const data = (await response.json()) as GridPlaneDto;
    gridPlaneDtoRef.current = data;
    setGridPlaneDto(data);
    setGridVersion((version) => version + 1);
    return data;
  }, []);

  const load = useCallback(
    (planeName: string): Promise<GridPlaneDto | undefined> => {
      planeNameRef.current = planeName;
      gridPlaneDtoRef.current = {};
      overridesRef.current.clear();
      return fetchPlane();
    },
    [fetchPlane],
  );

  const sendCommand = useCallback(
    (path: number[], override: GridOverride): Promise<GridPlaneDto | undefined> => {
      overridesRef.current.set(path.join(':'), { path, override });
      return fetchPlane();
    },
    [fetchPlane],
  );

  const setState = useCallback((path: number[], state: GridStateDto): void => {
    const targetGrid = resolveGrid(gridPlaneDtoRef.current.grids, path);
    if (targetGrid === undefined) {
      return;
    }
    targetGrid.state = { ...targetGrid.state, ...state };
    gridPlaneDtoRef.current = { ...gridPlaneDtoRef.current };
    setGridPlaneDto(gridPlaneDtoRef.current);
  }, []);

  const sendPatch = useCallback(async (path: number[], override: GridOverride): Promise<GridPlaneDto> => {
    // Keep the new state (e.g. isSelectedMulti) on the loaded grid so later commands like Reload or Save send it too.
    if (override.state !== undefined) {
      setState(path, override.state);
    }

    const entries: GridOverrideEntry[] = [{ path, override }];
    const grids: GridDto[] = (gridPlaneDtoRef.current.grids ?? []).map((existingGrid, gridIndex) =>
      buildOutgoingGrid(existingGrid, [gridIndex], entries),
    );

    const body: GridPlaneDto = { grids };
    if (planeNameRef.current !== undefined) {
      body.planeName = planeNameRef.current;
    }

    const response = await apiFetch('grid-patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return gridPlaneDtoRef.current;
    }
    const data = (await response.json()) as GridPlaneDto;

    // Patch the loaded grids in place; gridVersion is left as is so unsaved input text isn't reset.
    (gridPlaneDtoRef.current.grids ?? []).forEach((grid, gridIndex) => {
      const responseGrid = data.grids?.[gridIndex];
      if (responseGrid !== undefined) {
        applyPatches(grid, responseGrid);
      }
    });
    gridPlaneDtoRef.current = { ...gridPlaneDtoRef.current };
    setGridPlaneDto(gridPlaneDtoRef.current);

    return data;
  }, [setState]);

  const closePlane = useCallback((path: number[]): void => {
    const planesIndex = path[path.length - 2];
    const parentGrid = resolveGrid(gridPlaneDtoRef.current.grids, path.slice(0, -2));
    if (planesIndex === undefined || parentGrid?.planes?.[planesIndex] === undefined) {
      return;
    }
    parentGrid.planes = parentGrid.planes.map((gridPlane, index) => (index === planesIndex ? null : gridPlane));
    gridPlaneDtoRef.current = { ...gridPlaneDtoRef.current };
    setGridPlaneDto(gridPlaneDtoRef.current);
  }, []);

  return <GridStoreContext.Provider value={{ gridPlaneDto, gridVersion, load, sendCommand, sendPatch, setState, closePlane }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
