import { dbInsert, dbLoad, dbLoadByFilter, dbLoadByIds, dbUpdate } from '../core/util-db.js';
import { DebugContentDto, DebugPropertyDto } from '../../dto/db/debug-property-dto.js';

export async function debugContentLoad(request: Request): Promise<DebugContentDto[]> {
  return dbLoad<DebugContentDto>(request, 'DebugContentDto', false);
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugContentLoadByIds(request: Request, ids: string[]): Promise<DebugContentDto[]> {
  return dbLoadByIds<DebugContentDto>(request, 'DebugContentDto', ids, false);
}

export async function debugPropertyLoad(request: Request): Promise<DebugPropertyDto[]> {
  return dbLoad<DebugPropertyDto>(request, 'DebugPropertyDto', false);
}

/** Property names every owner of an ownerType has; missing ones are inserted by debugPropertyLoadByOwners. */
const DEBUG_PROPERTY_OWNER_PROPERTY_NAMES: Record<string, string[]> = {
  Row: ['ColumnCount', 'RowCount'],
  Cell: ['IsReadOnly'],
  CellTable: ['Color', 'IsDisabled'],
};

/**
 * Returns the properties attached to any of the owners (matching both ownerName and ownerType); none if owners is empty.
 * An owner's missing DEBUG_PROPERTY_OWNER_PROPERTY_NAMES[ownerType] properties are inserted first (name by gridDebugPropertyName).
 */
export async function debugPropertyLoadByOwners(
  request: Request,
  owners: Required<Pick<DebugPropertyDto, 'ownerName' | 'ownerType'>>[],
): Promise<DebugPropertyDto[]> {
  if (owners.length === 0) {
    return [];
  }
  const load = () =>
    dbLoadByFilter<DebugPropertyDto>(request, 'DebugPropertyDto', { $or: owners.map(({ ownerName, ownerType }) => ({ ownerName, ownerType })) }, false);

  const properties = await load();

  const missing = owners.flatMap(({ ownerName, ownerType }) =>
    (DEBUG_PROPERTY_OWNER_PROPERTY_NAMES[ownerType] ?? []).filter(
      (propertyName) =>
        !properties.some((property) => property.ownerName === ownerName && property.ownerType === ownerType && property.propertyName === propertyName),
    ).map((propertyName): DebugPropertyDto => {
      const property: DebugPropertyDto = { ownerName, ownerType, propertyName };
      property.name = gridDebugPropertyName(property);
      return property;
    }),
  );
  if (missing.length === 0) {
    return properties;
  }

  await debugPropertyInsert(request, missing);
  return load();
}

/**
 * Derives a property's name from its owner and property (ownerName being a path ending with "/", see gridDebugPropertyOwners):
 * ownerName + "PropertyName/<propertyName>/" if ownerType is "CellTable" (ownerName being the debug table cell),
 * otherwise ownerName + "OwnerType/<ownerType>/PropertyName/<propertyName>/".
 */
export function gridDebugPropertyName(property: DebugPropertyDto): string {
  if (property.ownerType === 'CellTable') {
    return (property.ownerName ?? '') + 'PropertyName/' + (property.propertyName ?? '') + '/';
  }
  return (property.ownerName ?? '') + 'OwnerType/' + (property.ownerType ?? '') + '/PropertyName/' + (property.propertyName ?? '') + '/';
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugPropertyLoadByIds(request: Request, ids: string[]): Promise<DebugPropertyDto[]> {
  return dbLoadByIds<DebugPropertyDto>(request, 'DebugPropertyDto', ids, false);
}

export async function debugPropertyInsert(request: Request, debugPropertyDtos: DebugPropertyDto[]): Promise<DebugPropertyDto[]> {
  return dbInsert<DebugPropertyDto>(request, 'DebugPropertyDto', debugPropertyDtos, false);
}

/** Updates debugPropertyDtos by _id. */
export async function debugPropertyUpdate(request: Request, debugPropertyDtos: DebugPropertyDto[]): Promise<DebugPropertyDto[]> {
  return dbUpdate<DebugPropertyDto>(request, 'DebugPropertyDto', debugPropertyDtos, false);
}
