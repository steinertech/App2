import { ObjectId } from 'mongodb';

export enum DesignBandEnum {
  None = 0,
  Header = 1,
  Grid = 2,
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
