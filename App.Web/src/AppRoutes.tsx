import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.tsx';
import App from './page/App.tsx';
import About from './page/About.tsx';
import Debug from './page/Debug.tsx';
import UserSignUp from './page/UserSignUp.tsx';
import UserSignIn from './page/UserSignIn.tsx';
import UserSignOut from './page/UserSignOut.tsx';
import Project from './page/Project.tsx';
import Storage from './page/Storage.tsx';

export const routePaths = ['', 'about', 'debug', 'user-sign-up', 'user-sign-in', 'user-sign-out', 'project', 'storage'];

function pageRoutes() {
  return (
    <>
      <Route index element={<App />} />
      <Route path="about" element={<About />} />
      <Route path="debug" element={<Debug />} />
      <Route path="user-sign-up" element={<UserSignUp />} />
      <Route path="user-sign-in" element={<UserSignIn />} />
      <Route path="user-sign-out" element={<UserSignOut />} />
      <Route path="project" element={<Project />} />
      <Route path="storage" element={<Storage />} />
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
