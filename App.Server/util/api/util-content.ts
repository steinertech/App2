import { dbLoadByFilter } from '../core/util-db.js';
import { DesignBandDto } from '../../dto/db/design-band-dto.js';
import { ContentDto, ContentRequestDto } from '../../dto/shared/content-dto.js';
import { contentBandLoad } from '../db/util-content-view.js';

/**
 * Builds the ContentDto named contentRequestDto.contentName from its DesignBandDto rows (DesignBandDto.contentName), ordered by sort.
 * Each band carries the propertyValue of its PropertyDto rows (see contentBandLoad).
 */
export async function contentApi(request: Request, contentRequestDto: ContentRequestDto): Promise<ContentDto> {
  const contentName = contentRequestDto.contentName ?? '';
  const bands = await dbLoadByFilter<DesignBandDto>(request, 'DesignBandDto', { contentName }, true, { sort: 1 });

  return { name: contentName, bands: await contentBandLoad(request, bands) };
}
