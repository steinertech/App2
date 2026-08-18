import { apiUrl } from '../page/App.tsx';
import type { GridAreaDto, GridCommandDto, GridDto } from '../../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

export class Grid {
  gridNames: string[];
  gridDto: GridDto = {};

  constructor(gridNames: string[]) {
    this.gridNames = gridNames;
  }

  async load(command?: GridCommandDto): Promise<GridDto> {
    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: this.gridNames.map((gridName): GridAreaDto => (command ? { gridName, command } : { gridName })),
      } satisfies GridDto),
    });
    this.gridDto = await response.json();
    return this.gridDto;
  }
}
