import { ObjectId } from 'mongodb';

/** Row of the Debug page's data grid (grid-debug.ts). */
export interface DebugDto {
  _id?: ObjectId;
  sectorKey?: string;
  type?: string;
  text?: string;
}
