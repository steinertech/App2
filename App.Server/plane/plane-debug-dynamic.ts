import { GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto } from '../dto/shared/grid-dto.js';
import { debugDynamicLoad } from '../util/db/util-debug-dynamic.js';
import { DebugDynamicDto } from '../dto/db/debug-dynamic-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridColumnChooserLoad, gridFilterMultiLoad, gridPatchDeleteMulti } from '../util/core/util-grid.js';
import { gridDataLoad } from '../util/core/util-grid-data.js';

const DEBUG_DYNAMIC_COLUMNS: GridConfigDto = {
  columns: (['name', 'tableName'] as const satisfies readonly (keyof DebugDynamicDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "debugDynamic" plane: the debug dynamic grid (GridPlaneDto.grids[0]). */
export async function planeDebugDynamicLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = await gridDebugDynamicLoad(request, gridPlaneDto.grids?.[0] ?? {});
  return { ...gridPlaneDto, grids: [gridDto] };
}

async function gridDebugDynamicLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  return gridDataLoad<DebugDynamicDto>(request, 'DebugDynamicDto', gridDto, { title: 'Debug Dynamic', columns: DEBUG_DYNAMIC_COLUMNS.columns ?? [], isColumnChooser: true }, false);
}

/**
 * Patches the "debugDynamic" plane's debug dynamic grid (GridPlaneDto.grids[0]): GridCommandEnum.ColumnChooser opens the Column Chooser lookup,
 * GridCommandEnum.FilterMulti the Filter Multi lookup (distinct texts of its column); any other command (MultiClick) enables/disables the DeleteMulti button.
 */
export async function planeDebugDynamicPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.ColumnChooser) {
    const lookupPlane = gridColumnChooserLoad(gridDto, DEBUG_DYNAMIC_COLUMNS.columns ?? []);
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DEBUG_DYNAMIC_COLUMNS.columns ?? [], await debugDynamicLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [await gridPatchDeleteMulti(request, gridDto)] };
}
