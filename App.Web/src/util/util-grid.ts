import { apiUrl } from '../page/App.tsx';
import type { GridDto } from '../../../App.Server/dto/web/grid-dto.ts';

export type { GridDto };

export class Grid {
  gridName: string;
  gridDto: GridDto = {};

  constructor(gridName: string) {
    this.gridName = gridName;
  }

  async load(): Promise<GridDto> {
    const response = await fetch(`${apiUrl}grid`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gridName: this.gridName } satisfies GridDto),
    });
    this.gridDto = await response.json();
    return this.gridDto;
  }
}
