import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridDto, GridPageDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridPageDto };

export type GridOverride = GridDto;

interface GridStoreValue {
  gridPageDto: GridPageDto;
  gridVersion: number;
  load: (pageName: string) => Promise<GridPageDto>;
  sendCommand: (gridIndex: number, override: GridOverride) => Promise<GridPageDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridPageDto, setGridPageDto] = useState<GridPageDto>({});
  const [gridVersion, setGridVersion] = useState(0);
  const gridPageDtoRef = useRef<GridPageDto>(gridPageDto);
  const pageNameRef = useRef<string | undefined>(undefined);
  const overridesRef = useRef<Map<number, GridOverride>>(new Map());

  const fetchPage = useCallback(async (): Promise<GridPageDto> => {
    const page: GridDto[] = (gridPageDtoRef.current.page ?? []).map((existingGrid, gridIndex) => {
      const override = overridesRef.current.get(gridIndex);
      const grid: GridDto = { ...existingGrid, ...override };
      delete grid.rows;
      return grid;
    });
    overridesRef.current.clear();

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
    (gridIndex: number, override: GridOverride): Promise<GridPageDto> => {
      overridesRef.current.set(gridIndex, override);
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
