export interface GridCellDto {
  text?: string;
}

export interface GridRowDto {
  gridCells?: GridCellDto[];
}

export interface GridAreaDto {
  text?: string;
  gridRows?: GridRowDto[];
}

export interface GridDto {
  gridName?: string;
  gridAreas?: { [gridAreaName: string]: GridAreaDto };
}
