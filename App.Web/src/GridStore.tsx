import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import { GridCommandEnum, type GridAreaDto, type GridCommandDto, type GridDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

interface GridStoreValue {
  gridDto: GridDto;
  load: (gridNames: string[]) => Promise<GridDto>;
  reload: (gridName: string) => Promise<GridDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridDto, setGridDto] = useState<GridDto>({});
  const gridNamesRef = useRef<string[]>([]);
  const commandsRef = useRef<Map<string, GridCommandDto>>(new Map());

  const fetchAreas = useCallback(async (gridNames: string[]): Promise<GridDto> => {
    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: gridNames.map((gridName): GridAreaDto => {
          const command = commandsRef.current.get(gridName);
          return command ? { gridName, command } : { gridName };
        }),
      } satisfies GridDto),
    });
    const data: GridDto = await response.json();
    commandsRef.current.clear();
    setGridDto(data);
    return data;
  }, []);

  const load = useCallback(
    (gridNames: string[]): Promise<GridDto> => {
      gridNamesRef.current = gridNames;
      return fetchAreas(gridNames);
    },
    [fetchAreas],
  );

  const reload = useCallback(
    (gridName: string): Promise<GridDto> => {
      commandsRef.current.set(gridName, { commandEnum: GridCommandEnum.Reload });
      return fetchAreas(gridNamesRef.current);
    },
    [fetchAreas],
  );

  return <GridStoreContext.Provider value={{ gridDto, load, reload }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
