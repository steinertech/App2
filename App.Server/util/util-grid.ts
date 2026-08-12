import { GridDto } from '../dto/grid-dto';

export function gridLoad(request: Request, gridDto: GridDto): GridDto {
  return {
    ...gridDto,
    gridRows: [
      { cells: [{ text: '1' }, { text: 'Hello' }] },
      { cells: [{ text: '2' }, { text: 'World' }] },
    ],
  };
}
