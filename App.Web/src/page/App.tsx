import { container } from '../style.ts';

export const apiUrl = '/api/';

export default function App() {
  return (
    <div className={container}>
      <div className="prose">
        <h1>Home</h1>
        <p>Welcome to demo app.</p>
      </div>
    </div>
  );
}
