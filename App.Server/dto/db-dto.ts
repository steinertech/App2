import { ObjectId } from 'mongodb';

/** Base of every DTO persisted in the single MongoDB collection ('myCollection'). */
export interface DbDto {
  /** MongoDB document id, assigned by MongoDB on insert. Serializes to a hex string over JSON (e.g. used as grid rowKey). */
  _id?: ObjectId;
  /** Scope of the document, built with sectorKey(request, isProject) ("Domain/<domainName>/Global/" or "Domain/<domainName>/Project/<projectName>/"). Used as query filter, so documents of other domains or projects are never read or written. */
  sectorKey?: string;
  /** Discriminator of the DTO stored in the shared collection, e.g. 'UserDto'. */
  type?: string;
  /** Unique key of the document within its type and sectorKey (e.g. user: "<domainName>/<email>", session: sessionId, design band: random UUID). */
  name?: string;
}
