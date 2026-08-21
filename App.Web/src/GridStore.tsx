import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridDto, GridPageDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridPageDto };

export type GridOverride = GridDto;

interface GridOverrideEntry {
  /** Address of the target GridDto: [gridIndex] for a root grid, or [gridIndex, pagesIndex, gridIndex, ...] for one nested under GridDto.pages. */
  path: number[];
  override: GridOverride;
}

interface GridStoreValue {
  gridPageDto: GridPageDto;
  gridVersion: number;
  load: (pageName: string) => Promise<GridPageDto>;
  sendCommand: (path: number[], override: GridOverride) => Promise<GridPageDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

function samePath(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Rebuilds a GridDto for sending to the server: strips rows (the server always recomputes them) and, recursively, applies any override addressed at this node or one nested under it. */
function buildOutgoingGrid(existingGrid: GridDto, path: number[], entries: GridOverrideEntry[]): GridDto {
  const entry = entries.find((candidate) => samePath(candidate.path, path));
  const grid: GridDto = { ...existingGrid, ...entry?.override };
  delete grid.rows;

  if (grid.pages !== undefined) {
    grid.pages = grid.pages.map((gridPage, pagesIndex) => ({
      ...gridPage,
      page: (gridPage.page ?? []).map((nestedGrid, gridIndex) => buildOutgoingGrid(nestedGrid, [...path, pagesIndex, gridIndex], entries)),
    }));
  }

  return grid;
}

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridPageDto, setGridPageDto] = useState<GridPageDto>({});
  const [gridVersion, setGridVersion] = useState(0);
  const gridPageDtoRef = useRef<GridPageDto>(gridPageDto);
  const pageNameRef = useRef<string | undefined>(undefined);
  const overridesRef = useRef<Map<string, GridOverrideEntry>>(new Map());

  const fetchPage = useCallback(async (): Promise<GridPageDto> => {
    const entries = [...overridesRef.current.values()];
    overridesRef.current.clear();

    const page: GridDto[] = (gridPageDtoRef.current.page ?? []).map((existingGrid, gridIndex) =>
      buildOutgoingGrid(existingGrid, [gridIndex], entries),
    );

    const body: GridPageDto = { page };
    if (pageNameRef.current !== undefined) {
      body.pageName = pageNameRef.current;
    }

    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as GridPageDto;
    gridPageDtoRef.current = data;
    setGridPageDto(data);
    setGridVersion((version) => version + 1);
    return data;
  }, []);

  const load = useCallback(
    (pageName: string): Promise<GridPageDto> => {
      pageNameRef.current = pageName;
      gridPageDtoRef.current = {};
      overridesRef.current.clear();
      return fetchPage();
    },
    [fetchPage],
  );

  const sendCommand = useCallback(
    (path: number[], override: GridOverride): Promise<GridPageDto> => {
      overridesRef.current.set(path.join(':'), { path, override });
      return fetchPage();
    },
    [fetchPage],
  );

  return <GridStoreContext.Provider value={{ gridPageDto, gridVersion, load, sendCommand }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
