import { ObjectId } from 'mongodb';

/** Base of every DTO persisted in the single MongoDB collection ('myCollection'). */
export interface DbDto {
  /** MongoDB document id, assigned by MongoDB on insert. Serializes to a hex string over JSON (e.g. used as grid rowKey). */
  _id?: ObjectId;
  /** Scope of the document, built with sectorKeyDb(request, type) or sectorKeyProjectDb(request, type) ("Domain/<domainName>/Global/Type/<type>/" or "Domain/<domainName>/Project/<projectName>/Type/<type>/"). Used as query filter, so documents of other domains or projects are never read or written. */
  sectorKey?: string;
  /** Discriminator of the DTO stored in the shared collection, e.g. 'UserDto'. */
  type?: string;
  /** Unique key of the document within its sectorKey (which includes the type, so it is unique per type; enforced by a unique index on the database, so a duplicate insert or update fails). Every derived DTO redeclares it with a comment on how it is built (and may narrow its type, e.g. DesignBandDto). */
  name?: string;
}
