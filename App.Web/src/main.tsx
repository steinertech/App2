import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Layout from './Layout.tsx';
import App from './page/App.tsx';
import About from './page/About.tsx';
import Debug from './page/Debug.tsx';
import UserRegister from './page/UserRegister.tsx';
import UserLogin from './page/UserLogin.tsx';
import UserLogout from './page/UserLogout.tsx';
import Project from './page/Project.tsx';
import Storage from './page/Storage.tsx';

function appRoutes() {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>{appRoutes()}</Route>
        <Route path="de" element={<Layout />}>
          {appRoutes()}
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
