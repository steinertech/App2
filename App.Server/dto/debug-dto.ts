import { DbDto } from './db-dto.js';

export interface DebugDto extends DbDto {
  text?: string;
}
