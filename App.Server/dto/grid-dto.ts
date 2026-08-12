export interface GridCellDto {
  text?: string;
}

export interface GridStateDto {
  name?: string;
}

export interface GridDto {
  gridRows?: GridCellDto[];
  gridState?: GridStateDto;
}
