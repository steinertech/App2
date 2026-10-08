import { ObjectId } from 'mongodb';

/** One row of the grid on the Design page. */
export interface DesignDto {
  _id?: ObjectId;
  /** Random UUID, set by the backend on insert (see designInsert). Used as the grid's rowKey. */
  name?: string;
  sectorKey?: string;
  type?: string;
  sort: number;
  text: string;
}
