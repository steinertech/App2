import { ObjectId } from 'mongodb';
import client, { DB_NAME } from './util-db.js';
import { DesignBandDto } from '../dto/design-dto.js';
import { PropertyDto, PropertyOwnerEnum } from '../dto/property-dto.js';
import { ContentBandEnum, DESIGN_BAND_PROPERTY_NAMES } from '../dto/shared/content-dto.js';
import { sectorKeyProjectDb } from './util-main.js';
import { PropertyOwner, propertyDeleteByOwnerNameRegex, propertyDeleteByOwners, propertyLoadByIds, propertyLoadByOwnerNameRegex, propertyLoadByOwners, propertySync, propertyUpdate } from './util-property.js';

// Design bands are per project: sectorKeyProjectDb (like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function designBandLoad(request: Request): Promise<DesignBandDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DesignBandDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function designBandLoadByIds(request: Request, ids: string[]): Promise<DesignBandDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DesignBandDto', _id: { $in: objectIds } }).toArray();
}

/** Derives a band's name from its content and band name: "ContentName/<contentName>/BandName/<bandName>/". */
export function designBandName(band: DesignBandDto): `ContentName/${string}/BandName/${string}/` {
  return `ContentName/${band.contentName ?? ''}/BandName/${band.bandName ?? ''}/`;
}

/** Sets each band's name by designBandName. */
export async function designBandInsert(request: Request, designBandDtos: DesignBandDto[]): Promise<DesignBandDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');

  const bands = designBandDtos.map((designBandDto): DesignBandDto => {
    const { _id, ...rest } = designBandDto;
    return { ...rest, name: designBandName(designBandDto), sectorKey: key, type: 'DesignBandDto' };
  });

  if (bands.length > 0) {
    await collection.insertMany(bands);
  }

  return bands;
}

/** Updates designBandDtos by _id, setting each band's name by designBandName. The properties of a renamed band stay with its old name (not moved). */
export async function designBandUpdate(request: Request, designBandDtos: DesignBandDto[]): Promise<DesignBandDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');

  const bands = designBandDtos
    .filter((designBandDto) => designBandDto._id !== undefined)
    .map((designBandDto): DesignBandDto => ({ ...designBandDto, name: designBandName(designBandDto), sectorKey: key, type: 'DesignBandDto' }));

  if (bands.length > 0) {
    await collection.bulkWrite(
      bands.map(({ _id, ...band }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DesignBandDto' },
          update: { $set: band },
        },
      })),
    );
  }

  return bands;
}

/** Deletes the design bands by ids (ObjectId hex strings, the grid's rowKeys) and their properties (also those of their form cells); invalid ids are ignored. */
export async function designBandDelete(request: Request, ids: string[]): Promise<void> {
  const bands = await designBandLoadByIds(request, ids);
  if (bands.length === 0) {
    return;
  }
  const key = await sectorKeyProjectDb(request, 'DesignBandDto');
  const collection = client.db(DB_NAME).collection<DesignBandDto>('myCollection');
  await propertyDeleteByOwners(request, bands.filter((band) => band.name).map((band) => designBandPropertyOwner(band.name!)));
  for (const band of bands.filter((band) => band.name)) {
    await propertyDeleteByOwnerNameRegex(request, PropertyOwnerEnum.DesignFormCell, designFormCellOwnerNameRegex(band.name!));
  }
  await collection.deleteMany({ sectorKey: key, type: 'DesignBandDto', _id: { $in: bands.map((band) => band._id!) } });
}

/** The owner of a design band's PropertyDto rows (ownerName is DesignBandDto.name). */
export function designBandPropertyOwner(bandName: string): PropertyOwner {
  return { ownerName: bandName, ownerEnum: PropertyOwnerEnum.DesignBand };
}

export async function designBandPropertyLoad(request: Request, bandName: string): Promise<PropertyDto[]> {
  return propertyLoadByOwners(request, [designBandPropertyOwner(bandName)]);
}

/** The PropertyDto.propertyName list of a cell of a ContentBandEnum.Form band. */
const DESIGN_FORM_CELL_PROPERTY_NAMES = ['FieldName', 'ColumnSpan', 'RowSpan'];

/** The owner of the PropertyDto rows of a cell of a Form band (ownerName is DesignBandDto.name + "RowIndex/<rowIndex>/ColumnName/<columnName>/"). */
export function designFormCellPropertyOwner(bandName: string, rowIndex: number, columnName: string): PropertyOwner {
  return { ownerName: bandName + 'RowIndex/' + rowIndex + '/ColumnName/' + columnName + '/', ownerEnum: PropertyOwnerEnum.DesignFormCell };
}

/** Matches the ownerName of every cell of the Form band bandName (designFormCellPropertyOwner: band name + "RowIndex/<rowIndex>/ColumnName/<columnName>/"). */
function designFormCellOwnerNameRegex(bandName: string): RegExp {
  const bandNameRegex = bandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${bandNameRegex}RowIndex/\\d+/ColumnName/[A-Z]+/$`);
}

/** Returns the properties of all cells of the Form band bandName. */
export async function designFormCellPropertyLoadAll(request: Request, bandName: string): Promise<PropertyDto[]> {
  return propertyLoadByOwnerNameRegex(request, PropertyOwnerEnum.DesignFormCell, designFormCellOwnerNameRegex(bandName));
}

export async function designFormCellPropertyLoad(request: Request, bandName: string, rowIndex: number, columnName: string): Promise<PropertyDto[]> {
  return propertyLoadByOwners(request, [designFormCellPropertyOwner(bandName, rowIndex, columnName)]);
}

/** Makes the properties of a Form band's cell match DESIGN_FORM_CELL_PROPERTY_NAMES (see propertySync). */
export async function designFormCellPropertySync(request: Request, bandName: string, rowIndex: number, columnName: string): Promise<void> {
  await propertySync(request, designFormCellPropertyOwner(bandName, rowIndex, columnName), DESIGN_FORM_CELL_PROPERTY_NAMES);
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones and properties of other owner types are ignored. */
export async function designBandFormPropertyLoadByIds(request: Request, ids: string[]): Promise<PropertyDto[]> {
  return (await propertyLoadByIds(request, ids)).filter((property) => property.ownerEnum === PropertyOwnerEnum.DesignBand || property.ownerEnum === PropertyOwnerEnum.DesignFormCell);
}

/** Updates the propertyValue of propertyDtos by _id; owner and propertyName are owned by designBandPropertySync. */
export async function designBandFormPropertyUpdate(request: Request, propertyDtos: PropertyDto[]): Promise<void> {
  await propertyUpdate(request, propertyDtos.map(({ _id, propertyValue }) => ({ _id, propertyValue })));
}

/**
 * Makes the properties of band match DESIGN_BAND_PROPERTY_NAMES of its bandEnum (see propertySync).
 * A band without a name has no properties.
 */
export async function designBandPropertySync(request: Request, band: DesignBandDto): Promise<void> {
  if (!band.name) {
    return;
  }
  const propertyNames = DESIGN_BAND_PROPERTY_NAMES[band.bandEnum ?? ContentBandEnum.None] ?? [];
  await propertySync(request, designBandPropertyOwner(band.name), propertyNames);
}
