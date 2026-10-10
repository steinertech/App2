import { GridPlaneDto } from '../dto/shared/grid-dto.js';

/** Loads the "design" plane: no grids. */
export async function planeDesignLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [] };
}
