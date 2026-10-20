import { DbDto } from './db-dto.js';
import { ContentBandEnum } from './shared/content-dto.js';

export interface DesignBandDto extends DbDto {
  /** contentName + "." + bandName, set by the backend when the band is saved (see designBandName). Not shown in App.Web. */
  name?: `${string}.${string}`;
  bandEnum?: ContentBandEnum;
  sort?: number;
  contentName?: string;
  bandName?: string;
}
