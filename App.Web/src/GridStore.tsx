import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridDto, GridPageDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridPageDto };

export type GridOverride = GridDto;

interface GridOverrideEntry {
  gridIndex: number;
  /** When set, the override targets the nested GridDto at page[gridIndex].pages[pagesIndex].page[0] instead of page[gridIndex]. */
  pagesIndex: number | undefined;
  override: GridOverride;
}

interface GridStoreValue {
  gridPageDto: GridPageDto;
  gridVersion: number;
  load: (pageName: string) => Promise<GridPageDto>;
  sendCommand: (gridIndex: number, pagesIndex: number | undefined, override: GridOverride) => Promise<GridPageDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridPageDto, setGridPageDto] = useState<GridPageDto>({});
  const [gridVersion, setGridVersion] = useState(0);
  const gridPageDtoRef = useRef<GridPageDto>(gridPageDto);
  const pageNameRef = useRef<string | undefined>(undefined);
  const overridesRef = useRef<Map<string, GridOverrideEntry>>(new Map());

  const fetchPage = useCallback(async (): Promise<GridPageDto> => {
    const entries = [...overridesRef.current.values()];
    overridesRef.current.clear();

    const page: GridDto[] = (gridPageDtoRef.current.page ?? []).map((existingGrid, gridIndex) => {
      const rootEntry = entries.find((entry) => entry.gridIndex === gridIndex && entry.pagesIndex === undefined);
      const grid: GridDto = { ...existingGrid, ...rootEntry?.override };
      delete grid.rows;

      const nestedEntries = entries.filter((entry) => entry.gridIndex === gridIndex && entry.pagesIndex !== undefined);
      if (nestedEntries.length > 0 && grid.pages !== undefined) {
        grid.pages = grid.pages.map((gridPage, pagesIndex) => {
          const nestedEntry = nestedEntries.find((entry) => entry.pagesIndex === pagesIndex);
          if (nestedEntry === undefined) {
            return gridPage;
          }
          const nestedGrid: GridDto = { ...gridPage.page?.[0], ...nestedEntry.override };
          delete nestedGrid.rows;
          return { ...gridPage, page: [nestedGrid] };
        });
      }

      return grid;
    });

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
    (gridIndex: number, pagesIndex: number | undefined, override: GridOverride): Promise<GridPageDto> => {
      overridesRef.current.set(`${gridIndex}:${pagesIndex ?? ''}`, { gridIndex, pagesIndex, override });
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
