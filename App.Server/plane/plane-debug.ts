import { GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto } from '../dto/shared/grid-dto.js';
import { debugLoad } from '../util/db/util-debug.js';
import { DebugDto } from '../dto/db/debug-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridColumnChooserLoad, gridFilterMultiLoad, gridPatchDeleteMulti } from '../util/core/util-grid.js';
import { gridDataLoad } from '../util/core/util-grid-data.js';

const DEBUG_CONFIG: GridConfigDto = {
  title: 'Debug Data',
  columns: (['name', 'text'] as const satisfies readonly (keyof DebugDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "debug" plane: the debug grid (GridPlaneDto.grids[0]). */
export async function planeDebugLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = await gridDebugLoad(request, gridPlaneDto.grids?.[0] ?? {});
  return { ...gridPlaneDto, grids: [gridDto] };
}

async function gridDebugLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  return gridDataLoad<DebugDto>(request, 'DebugDto', gridDto, { title: DEBUG_CONFIG.title, columns: DEBUG_CONFIG.columns ?? [], isColumnChooser: true }, false);
}

/**
 * Patches the "debug" plane's debug grid (GridPlaneDto.grids[0]): GridCommandEnum.ColumnChooser opens the Column Chooser lookup,
 * GridCommandEnum.FilterMulti the Filter Multi lookup (distinct texts of its column); any other command (MultiClick) enables/disables the DeleteMulti button.
 */
export async function planeDebugPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.ColumnChooser) {
    const lookupPlane = gridColumnChooserLoad(gridDto, DEBUG_CONFIG.columns ?? []);
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DEBUG_CONFIG.columns ?? [], await debugLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [await gridPatchDeleteMulti(request, gridDto)] };
}
