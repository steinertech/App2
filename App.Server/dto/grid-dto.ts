export interface GridCellDto {
  text?: string;
}

export interface GridRowDto {
  gridCells?: GridCellDto[];
}

export interface GridDto {
  name?: string;
  gridRows?: GridRowDto[];
}
