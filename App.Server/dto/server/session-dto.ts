import { ObjectId } from 'mongodb';

export interface SessionDto {
  _id?: ObjectId;
  email?: string;
  name?: string;
  projectName?: string;
  sectorKey?: string;
  domain?: string;
  type?: string;
  isLogin?: boolean;
  sessionId?: string;
}
