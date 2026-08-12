export interface GridCellDto {
  text?: string;
}

export interface GridRowDto {
  gridCells?: GridCellDto[];
}

export interface GridDto {
  gridName?: string;
  gridRows?: GridRowDto[];
}
