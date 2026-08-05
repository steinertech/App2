import { ObjectId } from 'mongodb';

export interface UserDto {
  _id?: ObjectId;
  email?: string;
  password?: string;
  sectorKey?: string;
  type?: string;
}
