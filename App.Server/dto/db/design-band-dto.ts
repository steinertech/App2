import { DbDto } from './db-dto.js';
import { ContentBandEnum } from '../shared/content-dto.js';

/** A column of a design band, e.g. of a ContentBandEnum.Table band (see DesignBandDto.columns). */
export interface DesignBandColumnDto {
  columnName?: string;
  isVisible?: boolean;
}

export interface DesignBandDto extends DbDto {
  /** "ContentName/<contentName>/BandName/<bandName>/", set by the backend when the band is saved (see designBandName). Not shown in App.Web. */
  name?: `ContentName/${string}/BandName/${string}/`;
  bandEnum?: ContentBandEnum;
  sort?: number;
  contentName?: string;
  bandName?: string;
  /** Shown (and isVisible chosen) by the Design Band grid's Columns dialog of a ContentBandEnum.Table row. */
  columns?: DesignBandColumnDto[];
}
