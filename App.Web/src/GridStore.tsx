import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiUrl } from './page/App.tsx';
import { GridCommandEnum, type GridAreaDto, type GridCommandDto, type GridDto } from '../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

interface GridStoreValue {
  gridDto: GridDto;
  load: (gridNames: string[]) => Promise<GridDto>;
  reload: (gridName: string) => Promise<GridDto>;
  sendArea: (area: GridAreaDto) => Promise<GridDto>;
}

const GridStoreContext = createContext<GridStoreValue | undefined>(undefined);

function mergeAreas(gridDto: GridDto, newAreas: GridAreaDto[]): GridDto {
  const areas = [...(gridDto.areas ?? [])];
  for (const area of newAreas) {
    const index = areas.findIndex((existing) => existing.gridName === area.gridName);
    if (index === -1) {
      areas.push(area);
    } else {
      areas[index] = area;
    }
  }
  return { ...gridDto, areas };
}

export function GridStoreProvider({ children }: { children: ReactNode }) {
  const [gridDto, setGridDto] = useState<GridDto>({});
  const gridNamesRef = useRef<string[]>([]);
  const commandsRef = useRef<Map<string, GridCommandDto>>(new Map());

  const fetchAreas = useCallback(async (areas: GridAreaDto[]): Promise<GridDto> => {
    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ areas } satisfies GridDto),
    });
    return (await response.json()) as GridDto;
  }, []);

  const load = useCallback(
    async (gridNames: string[]): Promise<GridDto> => {
      gridNamesRef.current = gridNames;
      const data = await fetchAreas(
        gridNames.map((gridName): GridAreaDto => {
          const command = commandsRef.current.get(gridName);
          return command ? { gridName, command } : { gridName };
        }),
      );
      commandsRef.current.clear();
      setGridDto(data);
      return data;
    },
    [fetchAreas],
  );

  const reload = useCallback(
    (gridName: string): Promise<GridDto> => {
      commandsRef.current.set(gridName, { commandEnum: GridCommandEnum.Reload });
      return load(gridNamesRef.current);
    },
    [load],
  );

  const sendArea = useCallback(
    async (area: GridAreaDto): Promise<GridDto> => {
      const data = await fetchAreas([area]);
      setGridDto((prev) => mergeAreas(prev, data.areas ?? []));
      return data;
    },
    [fetchAreas],
  );

  return <GridStoreContext.Provider value={{ gridDto, load, reload, sendArea }}>{children}</GridStoreContext.Provider>;
}

export function useGridStore(): GridStoreValue {
  const store = useContext(GridStoreContext);
  if (store === undefined) {
    throw new Error('useGridStore must be used within a GridStoreProvider');
  }
  return store;
}
