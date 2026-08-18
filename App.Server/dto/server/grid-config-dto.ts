export enum GridConfigTypeEnum {
  None = 0,
  Text = 1,
  Number = 2,
}

export interface GridConfigColumnDto {
  columnName?: string;
  typeEnum?: GridConfigTypeEnum;
}

export interface GridConfigDto {
  columns?: GridConfigColumnDto[];
}
