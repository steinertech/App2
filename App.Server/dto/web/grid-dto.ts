export enum GridCellEnum {
  None = 0,
  Text = 1,
  Header = 2,
  Custom = 3,
}

export enum GridCustomEnum {
  None = 0,
  Button = 1,
}

export interface GridCustomDto {
  gridCustomEnum?: GridCustomEnum;
  text?: string;
  name?: string;
}

export interface GridCellDto {
  gridCellEnum?: GridCellEnum;
  gridCustoms?: GridCustomDto[];
  text?: string;
}

export interface GridRowDto {
  gridCells?: GridCellDto[];
}

export interface GridStateDto {
}

export interface GridAreaDto {
  text?: string;
  gridRows?: GridRowDto[];
  gridState?: GridStateDto;
}

export interface GridDto {
  gridName?: string;
  gridAreas?: { [gridAreaName: string]: GridAreaDto };
}
