import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridAreaDto, GridDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

export type GridAreaOverride = GridAreaDto;

interface GridStoreValue {
  gridDto: GridDto;
  gridVersion: number;
  load: (pageName: string) => Promise<GridDto>;
  sendCommand: (gridIndex: number, override: GridAreaOverride) => Promise<GridDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridDto, setGridDto] = useState<GridDto>({});
  const [gridVersion, setGridVersion] = useState(0);
  const gridDtoRef = useRef<GridDto>(gridDto);
  const pageNameRef = useRef<string | undefined>(undefined);
  const overridesRef = useRef<Map<number, GridAreaOverride>>(new Map());

  const fetchAreas = useCallback(async (): Promise<GridDto> => {
    const areas: GridAreaDto[] = (gridDtoRef.current.areas ?? []).map((existingArea, gridIndex) => {
      const override = overridesRef.current.get(gridIndex);
      const area: GridAreaDto = { ...existingArea, ...override };
      delete area.rows;
      return area;
    });
    overridesRef.current.clear();

    const body: GridDto = { areas };
    if (pageNameRef.current !== undefined) {
      body.pageName = pageNameRef.current;
    }

    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as GridDto;
    gridDtoRef.current = data;
    setGridDto(data);
    setGridVersion((version) => version + 1);
    return data;
  }, []);

  const load = useCallback(
    (pageName: string): Promise<GridDto> => {
      pageNameRef.current = pageName;
      gridDtoRef.current = {};
      overridesRef.current.clear();
      return fetchAreas();
    },
    [fetchAreas],
  );

  const sendCommand = useCallback(
    (gridIndex: number, override: GridAreaOverride): Promise<GridDto> => {
      overridesRef.current.set(gridIndex, override);
      return fetchAreas();
    },
    [fetchAreas],
  );

  return <GridStoreContext.Provider value={{ gridDto, gridVersion, load, sendCommand }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
