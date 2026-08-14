import { ObjectId } from 'mongodb';

export interface ProjectDto {
  _id?: ObjectId;
  name?: string;
  sectorKey?: string;
  type?: string;
}
