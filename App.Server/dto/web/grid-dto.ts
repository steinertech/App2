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
  customEnum?: GridCustomEnum;
  text?: string;
  name?: string;
  rowIndex?: number;
}

export interface GridCommandDto {
  commandEnum?: GridCommandEnum;
  columnName?: string;
  rowIndex?: number;
  customName?: string;
}

export interface GridCellDto {
  cellEnum?: GridCellEnum;
  customs?: GridCustomDto[];
  text?: string;
  rowIndex?: number;
  columnName?: string;
}

export interface GridRowDto {
  cells?: GridCellDto[];
}

export interface GridStateDto {
  rowIndexSelected?: number;
}

export interface GridAreaDto {
  text?: string;
  rows?: GridRowDto[];
  state?: GridStateDto;
  command?: GridCommandDto;
  gridName?: string;
  rowKeys?: string[];
}

export interface GridDto {
  areas?: GridAreaDto[];
}
