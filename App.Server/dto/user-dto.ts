import { ObjectId } from 'mongodb';

export interface UserDto {
  _id?: ObjectId;
  email?: string;
  name?: string;
  password?: string;
  projectNames?: string[];
  projectName?: string;
  sectorKey?: string;
  type?: string;
}
