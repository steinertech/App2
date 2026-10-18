import client from './util-db.js';
import { PropertyDto } from '../dto/property-dto.js';
import { sectorKey } from './util-main.js';

export async function propertyLoad(request: Request): Promise<PropertyDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<PropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'PropertyDto' }).toArray();
}
