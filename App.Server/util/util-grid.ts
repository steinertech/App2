import { GridCellEnum, GridDto, GridRowDto } from '../dto/grid-dto.ts';
import { projects as fetchProjects } from './util-project.ts';
import { users } from './util-user.ts';
import { storageFiles } from './util-storage.ts';

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.gridName === 'project') {
    const projects = await fetchProjects(request);
    const projectGridRows: GridRowDto[] = [
      { gridCells: [{ gridCellEnum: GridCellEnum.Header, text: 'name' }, { gridCellEnum: GridCellEnum.Header, text: 'sectorKey' }] },
      ...projects.map((project) => ({
        gridCells: [{ text: project.name }, { text: project.sectorKey }],
      })),
    ];

    const userList = await users(request);
    const userGridRows: GridRowDto[] = [
      { gridCells: [{ gridCellEnum: GridCellEnum.Header, text: 'email' }, { gridCellEnum: GridCellEnum.Header, text: 'sectorKey' }] },
      ...userList.map((user) => ({
        gridCells: [{ text: user.email }, { text: user.sectorKey }],
      })),
    ];

    return {
      ...gridDto,
      gridAreas: {
        main: { text: 'Project Data', gridRows: projectGridRows },
        user: { text: 'User Data', gridRows: userGridRows },
      },
    };
  }

  if (gridDto.gridName === 'storage') {
    const files = await storageFiles(request);
    const gridRows: GridRowDto[] = [
      {
        gridCells: [
          { gridCellEnum: GridCellEnum.Header, text: 'fileName' },
          { gridCellEnum: GridCellEnum.Header, text: 'fileNameOnly' },
          { gridCellEnum: GridCellEnum.Header, text: 'isFolder' },
        ],
      },
      ...files.map((file) => ({
        gridCells: [
          { text: file.fileName },
          { text: file.fileNameOnly },
          { text: file.isFolder ? 'true' : 'false' },
        ],
      })),
    ];

    return {
      ...gridDto,
      gridAreas: { main: { text: 'Storage Data', gridRows } },
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
