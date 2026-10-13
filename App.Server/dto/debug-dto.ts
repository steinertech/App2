import { ObjectId } from 'mongodb';

export interface DebugDto {
  _id?: ObjectId;
  name?: string;
  sectorKey?: string;
  type?: string;
  text?: string;
}
