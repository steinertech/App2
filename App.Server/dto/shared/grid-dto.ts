export enum GridCellEnum {
  None = 0,
  Edit = 1,
  Header = 2,
  Custom = 3,
  Search = 4,
  Empty = 5,
}

export enum GridCustomEnum {
  None = 0,
  Button = 1,
  Label = 2,
  /** Rendered like Button; clicking it sends CustomButtonClick. */
  ButtonUpload = 3,
  /** Breadcrumb of GridStateDto.pathSegments; clicking a segment sends CustomButtonClick with pathIndex. */
  Path = 4,
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
}

export interface GridCustomDto {
  customEnum?: GridCustomEnum;
  text?: string;
  name?: string;
  rowIndex?: number;
  /** If true, render button as disabled */
  isDisabled?: boolean;
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
}

/** Returns the GridStateDto.pathSegments names joined with "/" plus a trailing "/" (e.g. "a/b/"), or "" if there are no segments. */
export function gridStatePath(state: GridStateDto | undefined): string {
  return (state?.pathSegments ?? [])
    .map((pathSegment) => pathSegment.name)
    .filter((name): name is string => name !== undefined)
    .map((name) => `${name}/`)
    .join('');
}

export interface GridDto {
  text?: string;
  rows?: GridRowDto[];
  state?: GridStateDto;
  command?: GridCommandDto;
  modifies?: GridModifyDto[];
  planes?: GridPlaneDto[];
  patches?: GridPatchDto[];
}

export interface GridPlaneDto {
  planeName?: string;
  grids?: GridDto[];
}

/** Returns all GridDtos of the GridPlaneDto and, recursively, of every GridPlaneDto nested under GridDto.planes, as a flat list (depth-first, each grid before its nested grids). */
export function gridPlaneGrids(plane: GridPlaneDto | undefined): GridDto[] {
  return (plane?.grids ?? []).flatMap((grid) => [
    grid,
    ...(grid.planes ?? []).flatMap((nestedPlane) => gridPlaneGrids(nestedPlane)),
  ]);
}
