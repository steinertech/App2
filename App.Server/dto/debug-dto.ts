import { DbDto } from './db-dto.js';

export interface DebugDto extends DbDto {
  text?: string;
}

export interface DebugPropertyDto extends DbDto {
  text?: string;
  propertyName?: string;
  propertyValue?: string;
}
