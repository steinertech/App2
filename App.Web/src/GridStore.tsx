import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import { GridCommandEnum, type GridAreaDto, type GridCommandDto, type GridDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

interface GridStoreValue {
  gridDto: GridDto;
  load: (gridNames: string[], command?: GridCommandDto) => Promise<GridDto>;
  reload: () => Promise<GridDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridDto, setGridDto] = useState<GridDto>({});
  const gridNamesRef = useRef<string[]>([]);

  const load = useCallback(async (gridNames: string[], command?: GridCommandDto): Promise<GridDto> => {
    gridNamesRef.current = gridNames;
    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: gridNames.map((gridName): GridAreaDto => (command ? { gridName, command } : { gridName })),
      } satisfies GridDto),
    });
    const data: GridDto = await response.json();
    setGridDto(data);
    return data;
  }, []);

  const reload = useCallback((): Promise<GridDto> => {
    return load(gridNamesRef.current, { commandEnum: GridCommandEnum.Reload });
  }, [load]);

  return <GridStoreContext.Provider value={{ gridDto, load, reload }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
