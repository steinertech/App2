import { ObjectId } from 'mongodb';

export interface DebugDto {
  _id?: ObjectId;
  sectorKey?: string;
  type?: string;
  name?: string;
  text?: string;
}
