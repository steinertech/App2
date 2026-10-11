import client from './util-db.js';
import { DesignBandDto } from '../dto/design-dto.js';
import { ContentBandEnum, ContentDto } from '../dto/shared/content-dto.js';
import { sectorKey } from './util-main.js';

/** Builds the ContentDto named contentName from its DesignBandDto rows (DesignBandDto.contentName), ordered by sort. */
export async function loadContent(request: Request, contentName: string): Promise<ContentDto> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignBandDto>('myCollection');
  const bands = await collection.find({ sectorKey: key, type: 'DesignBandDto', contentName }).sort({ sort: 1 }).toArray();
  return {
    name: contentName,
    bands: bands.map((band) => ({ bandEnum: band.bandEnum ?? ContentBandEnum.None })),
  };
}
