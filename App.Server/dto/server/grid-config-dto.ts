export enum GridConfigColumnType {
  None = 0,
  Text = 1,
  Number = 2,
}

export interface GridConfigColumnDto {
  columnName?: string;
  columnType?: GridConfigColumnType;
}

export interface GridConfigDto {
  columns?: GridConfigColumnDto[];
}
