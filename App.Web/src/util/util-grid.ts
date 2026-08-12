import { apiUrl } from '../page/App.tsx';

export interface GridCellDto {
  text?: string;
}

export interface GridRowDto {
  gridCells?: GridCellDto[];
}

export interface GridAreaDto {
  gridRows?: GridRowDto[];
}

export interface GridDto {
  gridName?: string;
  gridAreas?: GridAreaDto[];
}

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
