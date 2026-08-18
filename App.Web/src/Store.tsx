import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import type { GridAreaDto, GridCommandDto, GridDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

interface StoreValue {
  gridDto: GridDto;
  load: (gridNames: string[], command?: GridCommandDto) => Promise<GridDto>;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [gridDto, setGridDto] = useState<GridDto>({});

  const load = useCallback(async (gridNames: string[], command?: GridCommandDto): Promise<GridDto> => {
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

  return <StoreContext.Provider value={{ gridDto, load }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (store === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
}
