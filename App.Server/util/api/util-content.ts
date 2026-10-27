import client, { DB_NAME } from '../core/util-db.js';
import { DesignBandDto } from '../../dto/db/design-dto.js';
import { ContentDto, ContentRequestDto } from '../../dto/shared/content-dto.js';
import { sectorKeyProjectDb } from '../core/util-main.js';
import { contentBandLoad } from '../db/util-content-view.js';

/**
 * Builds the ContentDto named contentRequestDto.contentName from its DesignBandDto rows (DesignBandDto.contentName), ordered by sort.
 * Each band carries the propertyValue of its PropertyDto rows (see contentBandLoad).
 */
export async function contentApi(request: Request, contentRequestDto: ContentRequestDto): Promise<ContentDto> {
  const contentName = contentRequestDto.contentName ?? '';
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');
  const bands = await collection.find({ sectorKey: key, type: 'DesignBandDto', contentName }).sort({ sort: 1 }).toArray();

  return { name: contentName, bands: await contentBandLoad(request, bands) };
}
