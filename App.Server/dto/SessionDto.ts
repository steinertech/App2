import { ObjectId } from 'mongodb';

export interface SessionDto {
  _id?: ObjectId;
  email?: string;
  name?: string;
  sectorKey?: string;
  type?: string;
  isLogin?: boolean;
  sessionId?: string;
}
