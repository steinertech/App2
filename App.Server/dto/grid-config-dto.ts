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
  /**
   * Converts the column's raw value to the cell text, e.g. 5600 → "5.6kg" (see gridCellText). Not called for a missing (undefined or null) value,
   * whose text is always "". Defaults to String(value). Also used by the filter's partial text match.
   */
  valueToText?: (value: unknown) => string;
  /**
   * Parses a cell text back to the column's raw value, e.g. "5.6kg" → 5600 (see gridCellValue). Defaults to the text itself. Returns undefined
   * if text can't be parsed; may also throw an Error, whose message reaches the user as an alert (see apiHandler).
   * Also used by the filter to parse the operands of a compare ("> 5.6kg") or range ("1kg..2kg").
   */
  valueFromText?: (text: string) => unknown;
  /** Returns the column's raw value of a row, e.g. one nested in DynamicDto.values (see gridRowValue). Defaults to row[columnName]. */
  rowToValue?: (row: object) => unknown;
  /** Sets the column's raw value on a row, the counterpart of rowToValue (see gridRowValueSet). Defaults to row[columnName] = value. */
  rowValueSet?: (row: object, value: unknown) => void;
}

export interface GridConfigDto {
  /** Grid title (GridDto.title). */
  title: string;
  columns?: GridConfigColumnDto[];
  /** Toolbar Column Chooser button (its lookup opened by the plane's patcher with gridColumnChooserLoad). */
  isColumnChooser?: boolean;
}
