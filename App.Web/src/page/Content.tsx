import Content from '../Content.tsx';
import { container } from '../style.ts';

export default function ContentPage() {
  return (
    <div className={container}>
      <h1>Content</h1>
      <Content contentName="A" />
    </div>
  );
}
