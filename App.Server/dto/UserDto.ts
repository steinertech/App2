import { ObjectId } from 'mongodb';

export interface UserDto {
  _id?: ObjectId;
  email?: string;
  sectorKey?: string;
  type?: string;
}
