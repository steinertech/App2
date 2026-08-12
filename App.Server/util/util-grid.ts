import { GridDto, GridRowDto } from '../dto/grid-dto';
import { projectList } from './util-project';

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.gridName === 'project') {
    const projects = await projectList(request);
    const gridRows: GridRowDto[] = projects.map((project) => ({
      gridCells: [{ text: project.name }, { text: project.sectorKey }],
    }));
    return {
      ...gridDto,
      gridAreas: { main: { gridRows } },
    };
  }

  return {
    ...gridDto,
    gridAreas: {
      main: {
        gridRows: [
          { gridCells: [{ text: '1' }, { text: 'Hello' }] },
          { gridCells: [{ text: '2' }, { text: 'World' }] },
        ],
      },
    },
  };
}
