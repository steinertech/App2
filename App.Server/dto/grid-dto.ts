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
