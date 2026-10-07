/** Data grid cell specific controls. One per GridCellDto (table cell), selected by GridCellDto.cellEnum. */
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

/** Custom controls, rendered inside a GridCellEnum.Custom cell. Multiple can be in one table cell (GridCellDto.customs). */
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
  /** Rendered like Button; clicking it closes the plane containing this grid (sets it to null in the parent's GridDto.planes) without a server command call. */
  Cancel = 8,
  /** Rendered like Button; clicking it calls the server with GridCommandEnum.Ok, then (on success) closes the plane containing this grid (sets it to null in the parent's GridDto.planes). */
  Ok = 9,
  /** Data grid control bar: renders Reload, Save and New buttons (sending GridCommandEnum.Reload, Save and New), plus Previous and Next buttons (decreasing/increasing GridStateDto.pageIndex by one, then sending GridCommandEnum.Reload), the text "Page GridStateDto.pageIndex + 1 / GridStateDto.pageCount" and a page size picker (GRID_PAGE_ROW_COUNTS; sets GridStateDto.pageRowCount and pageIndex 0, then sends GridCommandEnum.Reload). Without it, a grid has none of these buttons. */
  Bar = 10,
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
  /** Command to open the column chooser; sent to /api/grid-patch. */
  ColumnChooser = 7,
  /** A GridCustomEnum.Ok button was clicked; App.Web closes the plane containing the grid afterwards. */
  Ok = 8,
  /** The filter (triangle down) button of a GridCellEnum.Header was clicked (columnName); sent to /api/grid-patch. */
  FilterMulti = 9,
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

/** One html table of a grid. See GridDto.tables. */
export interface GridTableDto {
  rows?: GridRowDto[];
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

/** What a GridPatchDto applies to. */
export enum GridPatchEnum {
  None = 0,
  /** Patches the GridCustomDto with GridCustomDto.name = GridPatchDto.name. */
  Button = 1,
  /** Opens GridPatchDto.lookup as lookup grid (the only grid of GridDto.planes[0]), e.g. for GridCommandEnum.ColumnChooser or FilterMulti. */
  Lookup = 2,
}

export interface GridPatchDto {
  patchEnum?: GridPatchEnum;
  name?: string;
  rowIndex?: number;
  isDisabled?: boolean;
  /** Lookup grid of a GridPatchEnum.Lookup patch. */
  lookup?: GridDto;
  /** GridPlaneDto.planeName of the lookup's plane (GridDto.planes[0]) of a GridPatchEnum.Lookup patch, e.g. filterMulti, so the backend keeps it open on later commands. */
  planeName?: string;
}

export interface GridStateFilterMultiDto {
  /** Cell texts (GridConfigColumnDto.valueToText) selected in the Filter Multi lookup. */
  texts?: string[];
}

export interface GridStateDto {
  /** rowIndex of selected row. Explicitly undefined allowed, so App.Web can clear it (on filter, sort or paging). */
  selected?: number | undefined;
  /** rowIndex of selected rows. Explicitly undefined allowed, so App.Web can clear it (on filter, sort or paging). */
  isSelectedMulti?: boolean[] | undefined;
  sort?: GridSortDto;
  pathSegments?: GridPathSegmentDto[];
  rowKeys?: string[];
  /** Names of the columns to display. */
  columnNames?: string[];
  /** Filter text per column (key: columnName, value: filter text). */
  filters?: Record<string, string>;
  /** Multi filter per column (key: columnName), set by the Filter Multi lookup's Ok button; no entry if all texts are selected. */
  filterMultis?: Record<string, GridStateFilterMultiDto>;
  /** Index of the displayed page (0 = first); changed by the GridCustomEnum.Bar Previous/Next buttons. */
  pageIndex?: number;
  /** Number of pages; shown in the GridCustomEnum.Bar as "Page pageIndex + 1 / pageCount". */
  pageCount?: number;
  /** Number of rows per page; defaults to GRID_PAGE_ROW_COUNT_DEFAULT, max GRID_PAGE_ROW_COUNT_MAX (enforced by the backend). */
  pageRowCount?: number;
  /** Custom JSON data (e.g. a pending action), sent back to the server unchanged with every request. Values must be JSON serializable. */
  custom?: Record<string, unknown>;
}

/** Default and max GridStateDto.pageRowCount, and the page sizes offered by the GridCustomEnum.Bar page size picker. */
export const GRID_PAGE_ROW_COUNT_DEFAULT = 5;
export const GRID_PAGE_ROW_COUNT_MAX = 10;
export const GRID_PAGE_ROW_COUNTS = [5, 10];

/** Returns the GridStateDto.pathSegments names joined with "/" plus a trailing "/" (e.g. "a/b/"), or "" if there are no segments. */
export function gridStatePath(state: GridStateDto | undefined): string {
  return (state?.pathSegments ?? [])
    .map((pathSegment) => pathSegment.name)
    .filter((name): name is string => name !== undefined)
    .map((name) => `${name}/`)
    .join('');
}

export interface GridSettingDto {
  /** If true, selecting a row sends GridCommandEnum.Reload (with GridStateDto.selected set) to the backend, e.g. to load detail data for the selected row. */
  isSelectReload?: boolean;
  /** If true, changing a GridCellDto.isSelectMulti checkbox sends GridCommandEnum.MultiClick to /api/grid-patch (e.g. to enable a DeleteMulti button); otherwise the new GridStateDto.isSelectedMulti is only kept on the client and sent with the next command. */
  isSelectMultiPatch?: boolean;
}

export interface GridDto {
  /** Heading shown above the grid. Unlike setting, it is sent back to the server with every request. */
  title?: string;
  /** Rendered as one html table each: tables[0] toolbar rows, tables[1] data rows (header, find and data rows; or a dialog's content), tables[2] GridCustomEnum.Bar rows, optional tables[3] footer rows (e.g. a dialog's Ok and Cancel buttons). */
  tables?: GridTableDto[];
  state?: GridStateDto;
  /** Not sent back to the server (stripped by App.Web), so the backend must set it on every response. */
  setting?: GridSettingDto;
  command?: GridCommandDto;
  modifies?: GridModifyDto[];
  customModifies?: GridCustomModifyDto[];
  /** Nested grids (e.g. dialogs). planes[0] is reserved for grid system lookups (e.g. Column Chooser, rendered by Grid.tsx as overlay); app dialogs start at planes[1]. A null entry is a plane closed by App.Web (GridCustomEnum.Cancel). */
  planes?: (GridPlaneDto | null)[];
  patches?: GridPatchDto[];
}

export interface GridPlaneDto {
  planeName?: string;
  grids?: GridDto[];
}

/** Returns all GridDtos of the GridPlaneDto and, recursively, of every GridPlaneDto nested under GridDto.planes, as a flat list (depth-first, each grid before its nested grids). */
export function gridPlaneGrids(plane: GridPlaneDto | null | undefined): GridDto[] {
  return (plane?.grids ?? []).flatMap((grid) => [
    grid,
    ...(grid.planes ?? []).flatMap((nestedPlane) => gridPlaneGrids(nestedPlane)),
  ]);
}
