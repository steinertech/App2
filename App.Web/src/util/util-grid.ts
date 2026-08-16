import { apiUrl } from '../page/App.tsx';
import type { GridAreaDto, GridDto } from '../../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

export class Grid {
  gridNames: string[];
  gridDto: GridDto = {};

  constructor(gridNames: string[]) {
    this.gridNames = gridNames;
  }

  async load(): Promise<GridDto> {
    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        gridAreas: this.gridNames.map((gridName): GridAreaDto => ({ gridName })),
      } satisfies GridDto),
    });
    this.gridDto = await response.json();
    return this.gridDto;
  }
}
