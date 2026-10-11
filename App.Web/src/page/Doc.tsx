import Content from '../Content.tsx';
import { container } from '../style.ts';

export default function Doc() {
  return (
    <div className={container}>
      <h1>Doc</h1>
      <Content contentName="A" />
    </div>
  );
}
