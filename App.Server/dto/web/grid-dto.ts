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

export enum GridCommandEnum {
  None = 0,
  CustomButtonClick = 1,
}

export interface GridCustomDto {
  gridCustomEnum?: GridCustomEnum;
  text?: string;
  name?: string;
  rowIndex?: number;
}

export interface GridCommandDto {
  gridCommandEnum?: GridCommandEnum;
  columnName?: string;
  rowIndex?: number;
  customName?: string;
}

export interface GridCellDto {
  gridCellEnum?: GridCellEnum;
  gridCustoms?: GridCustomDto[];
  text?: string;
  rowIndex?: number;
  columnName?: string;
}

export interface GridRowDto {
  gridCells?: GridCellDto[];
}

export interface GridStateDto {
  rowIndexSelected?: number;
}

export interface GridAreaDto {
  text?: string;
  gridRows?: GridRowDto[];
  gridState?: GridStateDto;
  gridCommand?: GridCommandDto;
}

export interface GridDto {
  gridName?: string;
  gridAreas?: { [gridAreaName: string]: GridAreaDto };
}
