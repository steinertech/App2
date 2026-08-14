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
