import { GridCellDto, GridCellEnum, GridDto, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { GridConfigColumnDto, GridConfigDto, GridConfigTypeEnum } from '../dto/grid-config-dto.js';
import { gridCellText, gridColumns, gridTables } from '../util/util-grid.js';
import { sectorKey } from '../util/util-main.js';

const DESIGN_COLUMNS: GridConfigDto = {
  columns: [{ columnName: 'band', typeEnum: GridConfigTypeEnum.Text }],
};

/** Static rows for now (not coming from the database). */
const DESIGN_ROWS: Record<string, unknown>[] = [{ band: 'Hello' }, { band: 'World' }];

/** Loads the "design" plane: one read-only grid (GridPlaneDto.grids[0]) with the static DESIGN_ROWS. */
export async function planeDesignLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [await gridDesignLoad(request, gridPlaneDto.grids?.[0] ?? {})] };
}

/** Data rows only: no toolbar, header, find or bar row. */
async function gridDesignLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  // Asserts the user is signed in (redirects to /sign-in otherwise), like the other signed-in pages.
  await sectorKey(request, true);

  // Load only: cells are read-only (GridCellEnum.Label).
  const rows: GridRowDto[] = DESIGN_ROWS.map((design, rowIndex) => ({
    cells: gridColumns(DESIGN_COLUMNS.columns ?? []).map(
      (column: GridConfigColumnDto): GridCellDto => ({
        cellEnum: GridCellEnum.Label,
        text: gridCellText(design[column.columnName ?? ''], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  return { ...gridDto, title: 'Dynamic', tables: gridTables([], rows), command: undefined };
}
