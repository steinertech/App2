import { DbDto } from './db-dto.js';
import { ContentBandEnum } from './shared/content-dto.js';

export interface DesignBandDto extends DbDto {
  /** Random UUID, set by the backend when the band is inserted (see designBandInsert). Not shown in App.Web. */
  name?: string;
  bandEnum?: ContentBandEnum;
  sort?: number;
  contentName?: string;
}
