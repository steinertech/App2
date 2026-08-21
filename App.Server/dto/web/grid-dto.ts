export enum GridCellEnum {
  None = 0,
  Text = 1,
  Header = 2,
  Custom = 3,
  Find = 4,
  Empty = 5,
}

export enum GridCustomEnum {
  None = 0,
  Button = 1,
}

export enum GridCommandEnum {
  None = 0,
  CustomButtonClick = 1,
  SortClick = 2,
  Reload = 3,
  Save = 4,
  New = 5,
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
  placeHolder?: string;
  isSortAsc?: boolean;
}

export interface GridRowDto {
  cells?: GridCellDto[];
}

export interface GridSortDto {
  isSortAsc?: boolean;
  columnName?: string;
}

export interface GridPathSegmentDto {
  name?: string;
  text?: string;
}

export interface GridModifyDto {
  cellEnum?: GridCellEnum;
  columnName?: string;
  rowIndex?: number;
  text?: string;
  textModified?: string;
}

export interface GridStateDto {
  rowIndexSelected?: number;
  sort?: GridSortDto;
  pathSegments?: GridPathSegmentDto[];
  rowKeys?: string[];
}

export interface GridDto {
  text?: string;
  rows?: GridRowDto[];
  state?: GridStateDto;
  command?: GridCommandDto;
  modifies?: GridModifyDto[];
}

export interface GridPageDto {
  pageName?: string;
  area?: GridDto[];
}
