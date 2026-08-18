import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridAreaDto, GridDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

export type GridAreaOverride = Omit<GridAreaDto, 'gridName'>;

interface GridStoreValue {
  gridDto: GridDto;
  load: (gridNames: string[]) => Promise<GridDto>;
  sendCommand: (gridName: string, override: GridAreaOverride) => Promise<GridDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridDto, setGridDto] = useState<GridDto>({});
  const gridNamesRef = useRef<string[]>([]);
  const overridesRef = useRef<Map<string, GridAreaOverride>>(new Map());

  const fetchAreas = useCallback(async (): Promise<GridDto> => {
    const areas: GridAreaDto[] = gridNamesRef.current.map((gridName) => ({
      gridName,
      ...overridesRef.current.get(gridName),
    }));
    overridesRef.current.clear();

    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ areas } satisfies GridDto),
    });
    const data = (await response.json()) as GridDto;
    setGridDto(data);
    return data;
  }, []);

  const load = useCallback(
    (gridNames: string[]): Promise<GridDto> => {
      gridNamesRef.current = gridNames;
      return fetchAreas();
    },
    [fetchAreas],
  );

  const sendCommand = useCallback(
    (gridName: string, override: GridAreaOverride): Promise<GridDto> => {
      overridesRef.current.set(gridName, override);
      return fetchAreas();
    },
    [fetchAreas],
  );

  return <GridStoreContext.Provider value={{ gridDto, load, sendCommand }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
