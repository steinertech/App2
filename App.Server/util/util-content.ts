import client from './util-db.js';
import { DesignBandDto } from '../dto/design-dto.js';
import { ContentBandEnum, ContentDto, DESIGN_BAND_PROPERTY_NAMES } from '../dto/shared/content-dto.js';
import { sectorKeyProjectDb } from './util-main.js';
import { designPropertyOwner } from './util-design.js';
import { propertyLoadByOwners } from './util-property.js';

/**
 * Builds the ContentDto named contentName from its DesignBandDto rows (DesignBandDto.contentName), ordered by sort.
 * Each band carries the propertyValue of its PropertyDto rows (owner designPropertyOwner(band.name)) in DESIGN_BAND_PROPERTY_NAMES[bandEnum] order ('' if missing, e.g. never synced).
 */
export async function loadContent(request: Request, contentName: string): Promise<ContentDto> {
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db().collection<DesignBandDto>('myCollection');
  const bands = await collection.find({ sectorKey: key, type: 'DesignBandDto', contentName }).sort({ sort: 1 }).toArray();

  const bandNames = bands.map((band) => band.name).filter((name): name is NonNullable<DesignBandDto['name']> => !!name);
  const properties = await propertyLoadByOwners(request, bandNames.map(designPropertyOwner));

  return {
    name: contentName,
    bands: bands.map((band) => {
      const bandEnum = band.bandEnum ?? ContentBandEnum.None;
      const propertyValues = (DESIGN_BAND_PROPERTY_NAMES[bandEnum] ?? []).map(
        (propertyName) => properties.find((property) => property.ownerName === band.name && property.propertyName === propertyName)?.propertyValue ?? '',
      );
      return { bandEnum, propertyValues };
    }),
  };
}
