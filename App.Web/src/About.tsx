import Nav from './Nav.tsx';

export default function About() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Nav />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        fontFamily: 'sans-serif'
      }}>
        <h1>About</h1>
      </div>
    </div>
  );
}
