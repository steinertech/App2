export enum GridCellEnum {
  None = 0,
  Edit = 1,
  Header = 2,
  /** Renders GridCellDto.customs; each GridCustomDto.customEnum (GridCustomEnum) picks its widget. */
  Custom = 3,
  Search = 4,
  Empty = 5,
  /** Renders GridCellDto.text as plain (read-only) text. */
  Label = 6,
}

export enum GridCustomEnum {
  None = 0,
  Button = 1,
  Label = 2,
  /** Rendered like Button; clicking it sends CustomButtonClick. */
  ButtonUpload = 3,
  /** Breadcrumb of GridStateDto.pathSegments; clicking a segment sends CustomButtonClick with pathIndex. */
  Path = 4,
  /** Text box with initial value GridCustomDto.text; while its value differs from text, it has a GridDto.customModifies entry. */
  Edit = 5,
  /** Image with url GridCustomDto.imageUrl; GridCustomDto.text is its alt text. */
  Image = 6,
  /** Rendered like Button; clicking it sends GridCommandEnum.ColumnChooser. */
  ColumnChooser = 7,
}

export enum GridCommandEnum {
  None = 0,
  CustomButtonClick = 1,
  SortClick = 2,
  Reload = 3,
  Save = 4,
  New = 5,
  /** A GridCellDto.isSelectMulti checkbox changed; rowIndex is the changed row, GridStateDto.isSelectedMulti the new selection. */
  MultiClick = 6,
  /** Command to open the column chooser. */
  ColumnChooser = 7,
}

export interface GridCustomDto {
  customEnum?: GridCustomEnum;
  text?: string;
  name?: string;
  rowIndex?: number;
  /** If true, render button as disabled */
  isDisabled?: boolean;
  /** Url of a GridCustomEnum.Image */
  imageUrl?: string;
}

export interface GridCommandDto {
  commandEnum?: GridCommandEnum;
  columnName?: string;
  rowIndex?: number;
  customName?: string;
  /** Index into GridStateDto.pathSegments of the clicked GridCustomEnum.Path segment, or -1 for the Root item. */
  pathIndex?: number;
}

export interface GridCellDto {
  cellEnum?: GridCellEnum;
  customs?: GridCustomDto[];
  text?: string;
  rowIndex?: number;
  columnName?: string;
  placeHolder?: string;
  isSortAsc?: boolean;
  isNew?: boolean;
  /** If true, show checkbox */
  isSelectMulti?: boolean;
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
  isNew?: boolean;
}

/** Text of a GridCustomEnum.Edit changed by the user, identified by customName (GridCustomDto.name) and rowIndex. */
export interface GridCustomModifyDto {
  customName?: string;
  rowIndex?: number;
  /** Original GridCustomDto.text */
  text?: string;
  textModified?: string;
}

export interface GridPatchDto {
  name?: string;
  rowIndex?: number;
  isDisabled?: boolean;
}

export interface GridStateDto {
  /** rowIndex of selected row */
  selected?: number;
  /** rowIndex of selected rows */
  isSelectedMulti?: boolean[];
  sort?: GridSortDto;
  pathSegments?: GridPathSegmentDto[];
  rowKeys?: string[];
  /** Names of the columns to display. */
  columnNames?: string[];
  /** Custom JSON data (e.g. a pending action), sent back to the server unchanged with every request. Values must be JSON serializable. */
  custom?: Record<string, unknown>;
}

/** Returns the GridStateDto.pathSegments names joined with "/" plus a trailing "/" (e.g. "a/b/"), or "" if there are no segments. */
export function gridStatePath(state: GridStateDto | undefined): string {
  return (state?.pathSegments ?? [])
    .map((pathSegment) => pathSegment.name)
    .filter((name): name is string => name !== undefined)
    .map((name) => `${name}/`)
    .join('');
}

export interface GridSettingDto {
  /** Heading shown above the grid. */
  title?: string;
  /** If true, selecting a row sends GridCommandEnum.Reload (with GridStateDto.selected set) to the backend, e.g. to load detail data for the selected row. */
  isSelectReload?: boolean;
}

export interface GridDto {
  rows?: GridRowDto[];
  state?: GridStateDto;
  /** Not sent back to the server (stripped by App.Web), so the backend must set it on every response. */
  setting?: GridSettingDto;
  command?: GridCommandDto;
  modifies?: GridModifyDto[];
  customModifies?: GridCustomModifyDto[];
  planes?: GridPlaneDto[];
  patches?: GridPatchDto[];
  lookup?: GridLookupDto;
}

export interface GridPlaneDto {
  planeName?: string;
  grids?: GridDto[];
}

export interface GridLookupDto {
  grid?: GridDto;
  cellEnum?: GridCellEnum;
  rowIndex?: number;
  columnName?: string;
}

/** Returns all GridDtos of the GridPlaneDto and, recursively, of every GridPlaneDto nested under GridDto.planes, as a flat list (depth-first, each grid before its nested grids). */
export function gridPlaneGrids(plane: GridPlaneDto | undefined): GridDto[] {
  return (plane?.grids ?? []).flatMap((grid) => [
    grid,
    ...(grid.planes ?? []).flatMap((nestedPlane) => gridPlaneGrids(nestedPlane)),
  ]);
}
