import type { GridPlaneDto } from '../../dto/shared/grid-dto.js';
import { CONTENT_VIEW_PLANE_NAME } from '../../dto/shared/content-dto.js';
import { gridCommandSortClick } from '../core/util-grid.js';
import { planeProjectLoad, planeProjectPatch } from '../../plane/plane-project.js';
import { planeDebugLoad, planeDebugPatch } from '../../plane/plane-debug.js';
import { planeDebugPropertyLoad, planeDebugPropertyPatch } from '../../plane/plane-debug-property.js';
import { planeDebugDynamicLoad, planeDebugDynamicPatch } from '../../plane/plane-debug-dynamic.js';
import { planeStorageLoad, planeStoragePatch } from '../../plane/plane-storage.js';
import { planeSchemaLoad, planeSchemaPatch } from '../../plane/plane-schema.js';
import { planeDynamicLoad, planeDynamicPatch } from '../../plane/plane-dynamic.js';
import { planeDesignLoad, planeDesignPatch } from '../../plane/plane-design.js';
import { planeContentViewLoad, planeContentViewPatch } from '../../plane/plane-content-view.js';

type GridPlaneLoader = (request: Request, gridPlaneDto: GridPlaneDto) => Promise<GridPlaneDto>;

/**
 * Loads the plane's grids from the incoming GridPlaneDto (each grid's state and command as sent by App.Web), including any grid that depends
 * on another grid of the plane, e.g. a detail grid of the selected row.
 */
const PLANE_LOADERS: Record<string, GridPlaneLoader> = {
  debug: planeDebugLoad,
  debugProperty: planeDebugPropertyLoad,
  debugDynamic: planeDebugDynamicLoad,
  project: planeProjectLoad,
  storage: planeStorageLoad,
  schema: planeSchemaLoad,
  dynamic: planeDynamicLoad,
  design: planeDesignLoad,
  [CONTENT_VIEW_PLANE_NAME]: planeContentViewLoad,
};

export async function gridLoadApi(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const loader = gridPlaneDto.planeName !== undefined ? PLANE_LOADERS[gridPlaneDto.planeName] : undefined;
  if (loader === undefined) {
    return { grids: [] };
  }

  (gridPlaneDto.grids ?? []).forEach((gridDto) => gridCommandSortClick(gridDto));

  return { grids: (await loader(request, gridPlaneDto)).grids };
}

/** Returns the plane's patches: GridPlaneDto.grids[i] carries GridDto.patches for the incoming grids[i]. */
type GridPlanePatcher = (request: Request, gridPlaneDto: GridPlaneDto) => Promise<GridPlaneDto>;

const PLANE_GRID_PATCHERS: Record<string, GridPlanePatcher> = {
  debug: planeDebugPatch,
  debugProperty: planeDebugPropertyPatch,
  debugDynamic: planeDebugDynamicPatch,
  project: planeProjectPatch,
  storage: planeStoragePatch,
  schema: planeSchemaPatch,
  dynamic: planeDynamicPatch,
  design: planeDesignPatch,
  [CONTENT_VIEW_PLANE_NAME]: planeContentViewPatch,
};

export async function gridPatchApi(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const patcher = gridPlaneDto.planeName !== undefined ? PLANE_GRID_PATCHERS[gridPlaneDto.planeName] : undefined;
  if (patcher === undefined) {
    return { grids: [] };
  }

  return { grids: (await patcher(request, gridPlaneDto)).grids };
}
