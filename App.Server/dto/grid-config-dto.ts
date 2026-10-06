export enum GridConfigTypeEnum {
  None = 0,
  Text = 1,
  Number = 2,
}

export interface GridConfigColumnDto {
  columnName?: string;
  /** Header text. Defaults to titleCase(columnName). */
  text?: string;
  typeEnum?: GridConfigTypeEnum;
  /** If true, the column is not sent to App.Web (see gridColumns). */
  isHide?: boolean;
  /** If set, sorting by this column sorts by columnNameSort instead of columnName. */
  columnNameSort?: string;
}

export interface GridConfigDto {
  columns?: GridConfigColumnDto[];
}
