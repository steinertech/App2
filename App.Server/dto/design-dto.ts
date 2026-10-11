import { ObjectId } from 'mongodb';
import { ContentBandEnum } from './shared/content-dto.js';

export interface DesignBandDto {
  _id?: ObjectId;
  /** Random UUID, set by the backend when the band is inserted (see designBandInsert). Not shown in App.Web. */
  name?: string;
  sectorKey?: string;
  type?: string;
  bandEnum?: ContentBandEnum;
  sort?: number;
  contentName?: string;
}

/** Property of a DesignBandDto, created and removed by designPropertySync according to the band's bandEnum (DESIGN_BAND_PROPERTY_NAMES). */
export interface DesignBandPropertyDto {
  _id?: ObjectId;
  /** Random UUID, set by the backend when the property is inserted (see designPropertySync). Not shown in App.Web. */
  name?: string;
  sectorKey?: string;
  type?: string;
  /** Foreign key: DesignBandDto.name of the owner band. */
  bandName?: string;
  propertyName?: string;
  propertyValue?: string;
}

/** The DesignBandPropertyDto.propertyName list of each ContentBandEnum. */
export const DESIGN_BAND_PROPERTY_NAMES: Record<ContentBandEnum, string[]> = {
  [ContentBandEnum.None]: [],
  [ContentBandEnum.Header]: ['Text'],
  [ContentBandEnum.Table]: ['TableName'],
  [ContentBandEnum.Form]: ['RowCount', 'ColumnCount'],
};
