import { ObjectId } from 'mongodb';

export interface UserDto {
  _id?: ObjectId;
  email?: string;
  name?: string;
  password?: string;
  projectNames?: string[];
  projectNameSelected?: string;
  sectorKey?: string;
  type?: string;
}
