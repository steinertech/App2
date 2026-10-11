import client from './util-db.js';
import { DesignBandDto } from '../dto/design-dto.js';
import { LayoutBandEnum, LayoutDto } from '../dto/shared/layout-dto.js';
import { sectorKey } from './util-main.js';

/** Builds the LayoutDto named layoutName from its DesignBandDto rows (DesignBandDto.layoutName), ordered by sort. */
export async function loadLayout(request: Request, layoutName: string): Promise<LayoutDto> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignBandDto>('myCollection');
  const bands = await collection.find({ sectorKey: key, type: 'DesignBandDto', layoutName }).sort({ sort: 1 }).toArray();
  return {
    name: layoutName,
    bands: bands.map((band) => ({ bandEnum: band.bandEnum ?? LayoutBandEnum.None })),
  };
}
