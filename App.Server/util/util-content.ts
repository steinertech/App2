import client, { DB_NAME } from './util-db.js';
import { DesignBandDto } from '../dto/db/design-dto.js';
import { ContentBandDto, ContentBandEnum, ContentDto, DESIGN_BAND_PROPERTY_NAMES } from '../dto/shared/content-dto.js';
import { sectorKeyProjectDb } from './util-main.js';
import { designBandPropertyOwner } from './util-design.js';
import { propertyLoadByOwners } from './util-property.js';

/**
 * Builds the ContentDto named contentName from its DesignBandDto rows (DesignBandDto.contentName), ordered by sort.
 * Each band carries the propertyValue of its PropertyDto rows (see contentBandLoad).
 */
export async function loadContent(request: Request, contentName: string): Promise<ContentDto> {
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');
  const bands = await collection.find({ sectorKey: key, type: 'DesignBandDto', contentName }).sort({ sort: 1 }).toArray();

  return { name: contentName, bands: await contentBandLoad(request, bands) };
}

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
