import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { dynamicLoad } from '../util/util-dynamic.js';
import { DynamicDto } from '../dto/dynamic-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridLookupSet, gridTables } from '../util/util-grid.js';

const DYNAMIC_COLUMNS: GridConfigDto = {
  columns: (['tableName'] as const satisfies readonly (keyof DynamicDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "dynamic" plane: the read-only dynamic grid (GridPlaneDto.grids[0]) with the distinct SchemaDto.tableName values. */
export async function planeDynamicLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};

  const allDynamics = await dynamicLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, DYNAMIC_COLUMNS.columns ?? [], allDynamics);

  // Filter-Sort-Page: dynamics holds only the rows of the current page.
  const { rows: dynamics, state: fspState } = gridFsp(allDynamics, DYNAMIC_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: gridColumns(DYNAMIC_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  // Load only: cells are read-only (GridCellEnum.Label).
  const rows: GridRowDto[] = dynamics.map((dynamic, rowIndex) => ({
    cells: gridColumns(DYNAMIC_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Label,
        text: gridCellText(dynamic[column.columnName as keyof DynamicDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the tableName, which is distinct.
  const rowKeys: string[] = dynamics.map((dynamic) => dynamic.tableName);
  const findRow = gridFindRow(gridColumns(DYNAMIC_COLUMNS.columns ?? []).map((column) => column.columnName));

  const result: GridDto = {
    ...gridDto,
    title: 'Dynamic',
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  // Lookup (planes[0]): Filter Multi (opened by planeDynamicPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, DYNAMIC_COLUMNS.columns ?? [], allDynamics));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return { ...gridPlaneDto, grids: [result] };
}

/** Patches the "dynamic" plane's dynamic grid (GridPlaneDto.grids[0]): GridCommandEnum.FilterMulti opens the Filter Multi lookup (distinct texts of its column). */
export async function planeDynamicPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DYNAMIC_COLUMNS.columns ?? [], await dynamicLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [{}] };
}
