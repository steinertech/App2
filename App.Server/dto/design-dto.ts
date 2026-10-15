import { DbDto } from './db-dto.js';
import { ContentBandEnum } from './shared/content-dto.js';

export interface DesignBandDto extends DbDto {
  /** Random UUID, set by the backend when the band is inserted (see designBandInsert). Not shown in App.Web. */
  name?: string;
  bandEnum?: ContentBandEnum;
  sort?: number;
  contentName?: string;
}

/** Property of a DesignBandDto, created and removed by designPropertySync according to the band's bandEnum (DESIGN_BAND_PROPERTY_NAMES). */
export interface DesignBandPropertyDto extends DbDto {
  /** Random UUID, set by the backend when the property is inserted (see designPropertySync). Not shown in App.Web. */
  name?: string;
  /** Foreign key: DesignBandDto.name of the owner band. */
  bandName?: string;
  propertyName?: string;
  propertyValue?: string;
}
