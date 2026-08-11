import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout.tsx';
import App from './App.tsx';
import About from './About.tsx';
import Debug from './Debug.tsx';
import UserRegister from './UserRegister.tsx';
import UserLogin from './UserLogin.tsx';
import UserLogout from './UserLogout.tsx';
import Project from './Project.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<App />} />
          <Route path="/about" element={<About />} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/user-register" element={<UserRegister />} />
          <Route path="/user-login" element={<UserLogin />} />
          <Route path="/user-logout" element={<UserLogout />} />
          <Route path="/project" element={<Project />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
