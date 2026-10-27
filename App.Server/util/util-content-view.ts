import client, { DB_NAME } from './util-db.js';
import { DesignBandDto } from '../dto/db/design-dto.js';
import { ContentBandDto } from '../dto/shared/content-dto.js';
import { sectorKeyProjectDb } from './util-main.js';
import { contentBandLoad } from './util-content.js';

/**
 * Returns the ContentBandDto (with its propertyValues, see contentBandLoad) of each DesignBandDto named by bandNames (DesignBandDto.name, the GridStateDto.custom
 * of a CONTENT_VIEW_PLANE_NAME grid); names not found are left out. Read from the database on every request, so a grid never trusts property values sent back by App.Web.
 */
export async function contentViewBandLoad(request: Request, bandNames: string[]): Promise<ContentBandDto[]> {
  if (bandNames.length === 0) {
    return [];
  }
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');
  const bands = await collection.find({ sectorKey: key, type: 'DesignBandDto', name: { $in: bandNames as NonNullable<DesignBandDto['name']>[] } }).toArray();
  return contentBandLoad(request, bands);
}
