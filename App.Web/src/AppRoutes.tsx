import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.tsx';
import App from './page/App.tsx';
import About from './page/About.tsx';
import Debug from './page/Debug.tsx';
import SignUp from './page/SignUp.tsx';
import SignIn from './page/SignIn.tsx';
import SignOut from './page/SignOut.tsx';
import Project from './page/Project.tsx';
import Storage from './page/Storage.tsx';
import Schema from './page/Schema.tsx';

export const routePaths = ['', 'about', 'debug', 'sign-up', 'sign-in', 'sign-out', 'project', 'storage', 'schema'];

function pageRoutes() {
  return (
    <>
      <Route index element={<App />} />
      <Route path="about" element={<About />} />
      <Route path="debug" element={<Debug />} />
      <Route path="sign-up" element={<SignUp />} />
      <Route path="sign-in" element={<SignIn />} />
      <Route path="sign-out" element={<SignOut />} />
      <Route path="project" element={<Project />} />
      <Route path="storage" element={<Storage />} />
      <Route path="schema" element={<Schema />} />
    </>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>{pageRoutes()}</Route>
      <Route path="de" element={<Layout />}>
        {pageRoutes()}
      </Route>
    </Routes>
  );
}
