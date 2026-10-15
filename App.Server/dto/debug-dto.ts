import { ObjectId } from 'mongodb';

export interface DebugDto {
  _id?: ObjectId;
  sectorKey?: string;
  type?: string;
  name?: string;
  text?: string;
}

export interface DebugPropertyDto {
  _id?: ObjectId;
  sectorKey?: string;
  type?: string;
  name?: string;
  text?: string;
  propertyName?: string;
  propertyValue?: string;
}
