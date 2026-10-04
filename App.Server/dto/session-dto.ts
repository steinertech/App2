import { ObjectId } from 'mongodb';

export interface SessionDto {
  _id?: ObjectId;
  email?: string;
  name?: string;
  projectName?: string;
  sectorKey?: string;
  type?: string;
  isSignIn?: boolean;
  sessionId?: string;
}
