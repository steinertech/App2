import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { schemaLoad, schemaUpdate, schemaInsert } from '../util/db/util-schema.js';
import { SchemaDto } from '../dto/db/schema-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridLookupSet, gridTables } from '../util/core/util-grid.js';
import { gridDataNew, gridDataSaveInsert, gridDataSaveUpdate } from '../util/core/util-grid-data.js';

const SCHEMA_COLUMNS: GridConfigDto = {
  title: 'Schema',
  columns: (['tableName', 'columnName'] as const satisfies readonly (keyof SchemaDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "schema" plane: the schema grid (GridPlaneDto.grids[0]). */
export async function planeSchemaLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await schemaUpdate(request, await gridDataSaveUpdate<SchemaDto>(request, 'SchemaDto', gridDto, SCHEMA_COLUMNS.columns ?? []));
    await schemaInsert(request, gridDataSaveInsert<SchemaDto>(gridDto, SCHEMA_COLUMNS.columns ?? [], () => ({ tableName: '', columnName: '' })));
  }

  const allSchemas = await schemaLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, SCHEMA_COLUMNS.columns ?? [], allSchemas);

  // Filter-Sort-Page: schemas holds only the rows of the current page.
  const { rows: schemas, state: fspState } = gridFsp(allSchemas, SCHEMA_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: gridColumns(SCHEMA_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = schemas.map((schema, rowIndex) => ({
    cells: gridColumns(SCHEMA_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: gridCellText(schema[column.columnName as keyof SchemaDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the _id (ObjectId hex), since name ("{tableName}.{columnName}") changes when a row is edited.
  const rowKeys: string[] = schemas.map((schema) => schema._id?.toHexString() ?? '');
  const findRow = gridFindRow(gridColumns(SCHEMA_COLUMNS.columns ?? []).map((column) => column.columnName));

  const result: GridDto = {
    ...gridDto,
    title: SCHEMA_COLUMNS.title,
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDataNew(result, gridColumns(SCHEMA_COLUMNS.columns ?? []));
  }

  // Lookup (planes[0]): Filter Multi (opened by planeSchemaPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, SCHEMA_COLUMNS.columns ?? [], allSchemas));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return { ...gridPlaneDto, grids: [result] };
}

/** Patches the "schema" plane's schema grid (GridPlaneDto.grids[0]): GridCommandEnum.FilterMulti opens the Filter Multi lookup (distinct texts of its column). */
export async function planeSchemaPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, SCHEMA_COLUMNS.columns ?? [], await schemaLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [{}] };
}
