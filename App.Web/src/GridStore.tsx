import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridDto, GridPlaneDto } from '../../App.Server/dto/web/grid-dto.ts';

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
  load: (planeName: string) => Promise<GridPlaneDto>;
  sendCommand: (path: number[], override: GridOverride) => Promise<GridPlaneDto>;
  /** Posts the plane with override applied at path to /api/grid-patch and applies the returned GridDto.patches to the loaded grids (rows aren't reloaded). override.state is also kept on the grid at path. */
  sendPatch: (path: number[], override: GridOverride) => Promise<GridPlaneDto>;
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
  return resolveGrid(grid?.planes?.[planesIndex]?.grids, [nestedGridIndex, ...rest]);
}

/** Rebuilds a GridDto for sending to the server: strips rows (the server always recomputes them) and, recursively, applies any override addressed at this node or one nested under it. */
function buildOutgoingGrid(existingGrid: GridDto, path: number[], entries: GridOverrideEntry[]): GridDto {
  const entry = entries.find((candidate) => samePath(candidate.path, path));
  const grid: GridDto = { ...existingGrid, ...entry?.override };
  delete grid.rows;

  if (grid.planes !== undefined) {
    grid.planes = grid.planes.map((gridPlane, planesIndex) => ({
      ...gridPlane,
      grids: (gridPlane.grids ?? []).map((nestedGrid, gridIndex) => buildOutgoingGrid(nestedGrid, [...path, planesIndex, gridIndex], entries)),
    }));
  }

  return grid;
}

/** Copies isDisabled from every patch in responseGrid.patches onto each GridCustomDto in grid whose name matches, then recurses into planes (the response mirrors the request's structure). */
function applyPatches(grid: GridDto, responseGrid: GridDto): void {
  for (const patch of responseGrid.patches ?? []) {
    for (const row of grid.rows ?? []) {
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
    (gridPlane.grids ?? []).forEach((nestedGrid, gridIndex) => {
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

  const fetchPlane = useCallback(async (): Promise<GridPlaneDto> => {
    const entries = [...overridesRef.current.values()];
    overridesRef.current.clear();

    const grids: GridDto[] = (gridPlaneDtoRef.current.grids ?? []).map((existingGrid, gridIndex) =>
      buildOutgoingGrid(existingGrid, [gridIndex], entries),
    );

    const body: GridPlaneDto = { grids };
    if (planeNameRef.current !== undefined) {
      body.planeName = planeNameRef.current;
    }

    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as GridPlaneDto;
    gridPlaneDtoRef.current = data;
    setGridPlaneDto(data);
    setGridVersion((version) => version + 1);
    return data;
  }, []);

  const load = useCallback(
    (planeName: string): Promise<GridPlaneDto> => {
      planeNameRef.current = planeName;
      gridPlaneDtoRef.current = {};
      overridesRef.current.clear();
      return fetchPlane();
    },
    [fetchPlane],
  );

  const sendCommand = useCallback(
    (path: number[], override: GridOverride): Promise<GridPlaneDto> => {
      overridesRef.current.set(path.join(':'), { path, override });
      return fetchPlane();
    },
    [fetchPlane],
  );

  const sendPatch = useCallback(async (path: number[], override: GridOverride): Promise<GridPlaneDto> => {
    // Keep the new state (e.g. isSelectedMulti) on the loaded grid so later commands like Reload or Save send it too.
    const targetGrid = resolveGrid(gridPlaneDtoRef.current.grids, path);
    if (targetGrid !== undefined && override.state !== undefined) {
      targetGrid.state = { ...targetGrid.state, ...override.state };
      gridPlaneDtoRef.current = { ...gridPlaneDtoRef.current };
      setGridPlaneDto(gridPlaneDtoRef.current);
    }

    const entries: GridOverrideEntry[] = [{ path, override }];
    const grids: GridDto[] = (gridPlaneDtoRef.current.grids ?? []).map((existingGrid, gridIndex) =>
      buildOutgoingGrid(existingGrid, [gridIndex], entries),
    );

    const body: GridPlaneDto = { grids };
    if (planeNameRef.current !== undefined) {
      body.planeName = planeNameRef.current;
    }

    const response = await fetch(`${apiUrl}grid-patch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
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
  }, []);

  return <GridStoreContext.Provider value={{ gridPlaneDto, gridVersion, load, sendCommand, sendPatch }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
