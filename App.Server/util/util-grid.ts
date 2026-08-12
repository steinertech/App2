import { GridDto, GridRowDto } from '../dto/grid-dto';
import { projects as fetchProjects } from './util-project';

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.gridName === 'project') {
    const projects = await fetchProjects(request);
    const gridRows: GridRowDto[] = projects.map((project) => ({
      gridCells: [{ text: project.name }, { text: project.sectorKey }],
    }));
    return {
      ...gridDto,
      gridAreas: { main: { text: 'Project Data', gridRows } },
    };
  }

  if (gridDto.gridName === 'helloWorld') {
    return {
      ...gridDto,
      gridAreas: {
        main: {
          text: 'Hello World Data',
          gridRows: [
            { gridCells: [{ text: '1' }, { text: 'Hello' }] },
            { gridCells: [{ text: '2' }, { text: 'World' }] },
          ],
        },
      },
    };
  }

  throw new Error(`Unknown gridName: ${gridDto.gridName}`);
}
