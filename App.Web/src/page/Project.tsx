import { useEffect } from 'react';
import Grid from '../Grid.tsx';
import { useGridStore } from '../GridStore.tsx';
import { container } from '../style.ts';

interface ProjectProps {
  /** Address of this Project's grid pair within the recursive GridPageDto tree: [] at the root, or a path ending at a GridDto.pages entry when rendered recursively from Grid. */
  path?: number[];
}

export default function Project({ path = [] }: ProjectProps) {
  const { load } = useGridStore();
  const isRoot = path.length === 0;

  useEffect(() => {
    if (isRoot) {
      void load('project');
    }
  }, [load, isRoot]);

  const grids = (
    <>
      <Grid path={[...path, 0]} />
      <Grid path={[...path, 1]} />
    </>
  );

  if (!isRoot) {
    return grids;
  }

  return (
    <div className={container}>
      <h1>Project</h1>
      {grids}
    </div>
  );
}
