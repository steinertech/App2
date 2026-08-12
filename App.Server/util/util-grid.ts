import { GridDto } from '../dto/grid-dto';

export function gridLoad(request: Request, gridDto: GridDto): GridDto {
  return {
    ...gridDto,
    gridAreas: {
      Main: {
        gridRows: [
          { gridCells: [{ text: '1' }, { text: 'Hello' }] },
          { gridCells: [{ text: '2' }, { text: 'World' }] },
        ],
      },
    },
  };
}
