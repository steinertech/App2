import client from './util-db.js';
import { DesignBandDto, DesignBandPropertyDto } from '../dto/design-dto.js';
import { ContentBandEnum, ContentDto, DESIGN_BAND_PROPERTY_NAMES } from '../dto/shared/content-dto.js';
import { sectorKey } from './util-main.js';

/**
 * Builds the ContentDto named contentName from its DesignBandDto rows (DesignBandDto.contentName), ordered by sort.
 * Each band carries the propertyValue of its DesignBandPropertyDto rows in DESIGN_BAND_PROPERTY_NAMES[bandEnum] order ('' if missing, e.g. never synced).
 */
export async function loadContent(request: Request, contentName: string): Promise<ContentDto> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignBandDto>('myCollection');
  const bands = await collection.find({ sectorKey: key, type: 'DesignBandDto', contentName }).sort({ sort: 1 }).toArray();

  const bandNames = bands.map((band) => band.name).filter((name): name is string => !!name);
  const properties = await client
    .db()
    .collection<DesignBandPropertyDto>('myCollection')
    .find({ sectorKey: key, type: 'DesignBandPropertyDto', bandName: { $in: bandNames } })
    .toArray();

  return {
    name: contentName,
    bands: bands.map((band) => {
      const bandEnum = band.bandEnum ?? ContentBandEnum.None;
      const propertyValues = (DESIGN_BAND_PROPERTY_NAMES[bandEnum] ?? []).map(
        (propertyName) => properties.find((property) => property.bandName === band.name && property.propertyName === propertyName)?.propertyValue ?? '',
      );
      return { bandEnum, propertyValues };
    }),
  };
}
