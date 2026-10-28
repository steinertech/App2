import { dbLoadByFilter } from '../core/util-db.js';
import { DesignBandDto } from '../../dto/db/design-band-dto.js';
import { ContentBandDto, ContentBandEnum, DESIGN_BAND_PROPERTY_NAMES } from '../../dto/shared/content-dto.js';
import { designBandPropertyOwner } from './util-design.js';
import { propertyLoadByOwners } from './util-property.js';

/**
 * Returns the ContentBandDto of each band (in bands order), carrying the propertyValue of its PropertyDto rows (owner designBandPropertyOwner(band.name))
 * in DESIGN_BAND_PROPERTY_NAMES[bandEnum] order ('' if missing, e.g. never synced), and the columns hidden by DesignBandColumnDto.isVisible.
 */
export async function contentBandLoad(request: Request, bands: DesignBandDto[]): Promise<ContentBandDto[]> {
  const bandNames = bands.map((band) => band.name).filter((name): name is NonNullable<DesignBandDto['name']> => !!name);
  const properties = await propertyLoadByOwners(request, bandNames.map(designBandPropertyOwner));

  return bands.map((band) => {
    const bandEnum = band.bandEnum ?? ContentBandEnum.None;
    const propertyValues = (DESIGN_BAND_PROPERTY_NAMES[bandEnum] ?? []).map(
      (propertyName) => properties.find((property) => property.ownerName === band.name && property.propertyName === propertyName)?.propertyValue ?? '',
    );
    const hiddenColumnNames = (band.columns ?? []).filter((column) => column.isVisible === false).map((column) => column.columnName ?? '');
    return { name: band.name ?? '', bandEnum, propertyValues, hiddenColumnNames };
  });
}

/**
 * Returns the ContentBandDto (with its propertyValues, see contentBandLoad) of each DesignBandDto named by bandNames (DesignBandDto.name, the GridStateDto.custom
 * of a CONTENT_VIEW_PLANE_NAME grid); names not found are left out. Read from the database on every request, so a grid never trusts property values sent back by App.Web.
 */
export async function contentViewBandLoad(request: Request, bandNames: string[]): Promise<ContentBandDto[]> {
  if (bandNames.length === 0) {
    return [];
  }
  const bands = await dbLoadByFilter<DesignBandDto>(request, 'DesignBandDto', { name: { $in: bandNames as NonNullable<DesignBandDto['name']>[] } });
  return contentBandLoad(request, bands);
}
