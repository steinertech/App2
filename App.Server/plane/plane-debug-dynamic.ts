import { GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto } from '../dto/shared/grid-dto.js';
import { debugDynamicSchemaLoad } from '../util/db/util-debug-dynamic-schema.js';
import { DebugDynamicSchemaDto } from '../dto/db/debug-dynamic-schema-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridColumnChooserLoad, gridFilterMultiLoad, gridPatchDeleteMulti } from '../util/core/util-grid.js';
import { gridDataLoad } from '../util/core/util-grid-data.js';

/** Parses an "Is Property" cell text: true/yes/1 → true, false/no/0 or empty → false. */
function debugDynamicSchemaIsPropertyFromText(text: string): boolean {
  const value = text.trim().toLowerCase();
  if (['true', 'yes', '1'].includes(value)) {
    return true;
  }
  if (['', 'false', 'no', '0'].includes(value)) {
    return false;
  }
  throw new Error(`Is Property "${text}" is not true or false!`);
}

const DEBUG_DYNAMIC_COLUMNS: GridConfigDto = {
  title: 'Debug Dynamic Schema',
  columns: [
    ...(['name', 'text', 'dynamicTableName', 'dynamicColumnName'] as const satisfies readonly (keyof DebugDynamicSchemaDto)[]).map(
      (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
    ),
    {
      columnName: 'isProperty' satisfies keyof DebugDynamicSchemaDto,
      text: 'Is Property',
      typeEnum: GridConfigTypeEnum.Text,
      valueToText: (value) => (value === true ? 'true' : 'false'),
      valueFromText: debugDynamicSchemaIsPropertyFromText,
    },
  ],
};

/** Loads the "debugDynamic" plane: the debug dynamic grid (GridPlaneDto.grids[0]). */
export async function planeDebugDynamicLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = await gridDebugDynamicLoad(request, gridPlaneDto.grids?.[0] ?? {});
  return { ...gridPlaneDto, grids: [gridDto] };
}

async function gridDebugDynamicLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  return gridDataLoad<DebugDynamicSchemaDto>(request, 'DebugDynamicSchemaDto', gridDto, { title: DEBUG_DYNAMIC_COLUMNS.title, columns: DEBUG_DYNAMIC_COLUMNS.columns ?? [], isColumnChooser: true }, false);
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
    const lookupPlane = gridFilterMultiLoad(gridDto, DEBUG_DYNAMIC_COLUMNS.columns ?? [], await debugDynamicSchemaLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [await gridPatchDeleteMulti(request, gridDto)] };
}
