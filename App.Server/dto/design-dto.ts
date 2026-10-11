import { ObjectId } from 'mongodb';

export enum DesignBandEnum {
  None = 0,
  Header = 1,
  Table = 2,
  Form = 3,
}

export interface DesignBandDto {
  _id?: ObjectId;
  /** Random UUID, set by the backend when the band is inserted (see designBandInsert). Not shown in App.Web. */
  name?: string;
  sectorKey?: string;
  type?: string;
  bandEnum?: DesignBandEnum;
  sort?: number;
}

/** Property of a DesignBandDto, created and removed by designPropertySync according to the band's bandEnum (DESIGN_BAND_PROPERTY_NAMES). */
export interface DesignPropertyDto {
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

/** The DesignPropertyDto.propertyName list of each DesignBandEnum. */
export const DESIGN_BAND_PROPERTY_NAMES: Record<DesignBandEnum, string[]> = {
  [DesignBandEnum.None]: [],
  [DesignBandEnum.Header]: ['Text'],
  [DesignBandEnum.Table]: ['TableName'],
  [DesignBandEnum.Form]: ['RowCount', 'ColumnCount'],
};
