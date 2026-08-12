export interface GridCellDto {
  text?: string;
}

export interface GridDto {
  name?: string;
  gridRows?: GridCellDto[];
}
