import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.tsx';
import App from './page/App.tsx';
import About from './page/About.tsx';
import Debug from './page/Debug.tsx';
import UserRegister from './page/UserRegister.tsx';
import UserLogin from './page/UserLogin.tsx';
import UserLogout from './page/UserLogout.tsx';
import Project from './page/Project.tsx';
import Storage from './page/Storage.tsx';

export const routePaths = ['', 'about', 'debug', 'user-register', 'user-login', 'user-logout', 'project', 'storage'];

function pageRoutes() {
  return (
    <>
      <Route index element={<App />} />
      <Route path="about" element={<About />} />
      <Route path="debug" element={<Debug />} />
      <Route path="user-register" element={<UserRegister />} />
      <Route path="user-login" element={<UserLogin />} />
      <Route path="user-logout" element={<UserLogout />} />
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
