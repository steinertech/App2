import { GridDto, GridPlaneDto } from '../dto/shared/grid-dto.js';
import { DesignMasterDetailDto } from '../dto/db/design-master-detail-dto.js';
import { GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { designMasterDetailCycle, designMasterDetailDelete, designMasterDetailInsert, designMasterDetailLoad, designMasterDetailUpdate } from '../util/db/util-design-master-detail.js';
import { gridFilterMultiLoad } from '../util/core/util-grid.js';
import { gridDataLoad } from '../util/core/util-grid-data.js';

// The Design Master Detail grid of the "design" plane (GridPlaneDto.grids[3], see planeDesignLoad/planeDesignPatch in plane-design.ts).

/** Parses an "Is Active" cell text: true/yes/1 → true, false/no/0 or empty → false. */
function designMasterDetailIsActiveFromText(text: string): boolean {
  const value = text.trim().toLowerCase();
  if (['true', 'yes', '1'].includes(value)) {
    return true;
  }
  if (['', 'false', 'no', '0'].includes(value)) {
    return false;
  }
  throw new Error(`Is Active "${text}" is not true or false!`);
}

// name is not a column, so it's never sent to App.Web (designMasterDetailInsert/designMasterDetailUpdate set it by designMasterDetailName).
const DESIGN_MASTER_DETAIL_COLUMNS: GridConfigDto = {
  title: 'Design Master Detail',
  columns: [
    { columnName: 'contentName' satisfies keyof DesignMasterDetailDto, text: 'Content', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'bandNameMaster' satisfies keyof DesignMasterDetailDto, text: 'Master Band', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'fieldNameMaster' satisfies keyof DesignMasterDetailDto, text: 'Master Field', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'bandNameDetail' satisfies keyof DesignMasterDetailDto, text: 'Detail Band', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'fieldNameDetail' satisfies keyof DesignMasterDetailDto, text: 'Detail Field', typeEnum: GridConfigTypeEnum.Text },
    {
      columnName: 'isActive' satisfies keyof DesignMasterDetailDto,
      text: 'Is Active',
      typeEnum: GridConfigTypeEnum.Text,
      valueToText: (value) => (value === true ? 'true' : 'false'),
      valueFromText: designMasterDetailIsActiveFromText,
    },
  ],
};

/**
 * Builds the Design Master Detail grid like the design band grid: row Delete and multi select Delete (toolbar DeleteMulti) with the same confirmation dialog
 * (gridDataDeleteConfirm), and the bar (New, Save, Reload, pager). No other grid depends on it.
 */
export async function gridDesignMasterDetailLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  return gridDataLoad<DesignMasterDetailDto>(request, 'DesignMasterDetailDto', gridDto, {
    title: DESIGN_MASTER_DETAIL_COLUMNS.title,
    columns: DESIGN_MASTER_DETAIL_COLUMNS.columns ?? [],
    save: async (updates, inserts) => {
      // Nothing is written if the saved master details would be circular (a content view can't tell which grid to filter first). The error keeps App.Web's
      // unsaved input, so the user can correct it.
      const cycle = designMasterDetailCycle([
        ...(await designMasterDetailLoad(request)).map((masterDetail) =>
          updates.find((update) => update._id?.toHexString() === masterDetail._id?.toHexString()) ?? masterDetail),
        ...inserts,
      ]);
      if (cycle !== undefined) {
        throw new Error(`Design Master Detail is circular: ${cycle.join(' → ')}`);
      }
      await designMasterDetailUpdate(request, updates);
      await designMasterDetailInsert(request, inserts);
    },
    delete: (ids) => designMasterDetailDelete(request, ids),
  });
}

/** Returns the Filter Multi lookup plane (distinct texts of its column) of the Design Master Detail grid gridDto, for planeDesignPatch. */
export async function gridDesignMasterDetailFilterMultiLoad(request: Request, gridDto: GridDto): Promise<GridPlaneDto | undefined> {
  return gridFilterMultiLoad(gridDto, DESIGN_MASTER_DETAIL_COLUMNS.columns ?? [], await designMasterDetailLoad(request));
}
