import { GridCellDto, GridCellEnum, GridDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { usersLoad } from '../util/util-user.js';
import { UserDto } from '../dto/user-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridColumns, gridFindRow, gridHeaderCell, gridTables } from '../util/util-grid.js';

const USER_COLUMNS: GridConfigDto = {
  columns: (['email', 'sectorKey'] as const satisfies readonly (keyof UserDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

export async function gridLoadUser(request: Request, gridDto: GridDto): Promise<GridDto> {
  const users = await usersLoad(request);

  const headerRow: GridRowDto = {
    cells: gridColumns(USER_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = users.map((user, rowIndex) => ({
    cells: gridColumns(USER_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: user[column.columnName as keyof UserDto] as string | undefined,
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));
  const findRow = gridFindRow([...gridColumns(USER_COLUMNS.columns ?? []).map((column) => column.columnName)]);

  return { ...gridDto, setting: { title: 'User Data' }, tables: gridTables([], [headerRow, findRow, ...rows]) };
}
