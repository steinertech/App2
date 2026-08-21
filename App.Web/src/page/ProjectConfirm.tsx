import Grid from '../Grid.tsx';
import { container } from '../style.ts';

export default function ProjectConfirm() {
  return (
    <div className={container}>
      <h1>Confirm</h1>
      <Grid gridIndex={0} pagesIndex={0} />
    </div>
  );
}
