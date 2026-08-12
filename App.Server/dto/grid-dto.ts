export interface GridCellDto {
  text?: string;
}

export interface GridRowDto {
  cells?: GridCellDto[];
}

export interface GridDto {
  name?: string;
  gridRows?: GridRowDto[];
}
