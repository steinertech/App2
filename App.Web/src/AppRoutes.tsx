import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.tsx';
import App from './page/App.tsx';
import About from './page/About.tsx';
import Debug from './page/Debug.tsx';
import DebugLayout from './page/DebugLayout.tsx';
import DebugProperty from './page/DebugProperty.tsx';
import DebugDynamic from './page/DebugDynamic.tsx';
import SignUp from './page/SignUp.tsx';
import SignIn from './page/SignIn.tsx';
import SignOut from './page/SignOut.tsx';
import Project from './page/Project.tsx';
import Storage from './page/Storage.tsx';
import Schema from './page/Schema.tsx';
import SchemaLayout from './page/SchemaLayout.tsx';
import Dynamic from './page/Dynamic.tsx';
import Design from './page/Design.tsx';
import ContentPage from './page/Content.tsx';

export const routePaths = ['', 'about', 'debug', 'debug/debug-property', 'debug/debug-dynamic', 'sign-up', 'sign-in', 'sign-out', 'project', 'storage', 'schema', 'dynamic', 'design', 'content'];

function pageRoutes() {
  return (
    <>
      <Route index element={<App />} />
      <Route path="about" element={<About />} />
      <Route path="debug" element={<DebugLayout />}>
        <Route index element={<Debug />} />
        <Route path="debug-property" element={<DebugProperty />} />
        <Route path="debug-dynamic" element={<DebugDynamic />} />
      </Route>
      <Route path="sign-up" element={<SignUp />} />
      <Route path="sign-in" element={<SignIn />} />
      <Route path="sign-out" element={<SignOut />} />
      <Route path="project" element={<Project />} />
      <Route path="storage" element={<Storage />} />
      <Route element={<SchemaLayout />}>
        <Route path="schema" element={<Schema />} />
        <Route path="dynamic" element={<Dynamic />} />
        <Route path="design" element={<Design />} />
        <Route path="content" element={<ContentPage />} />
      </Route>
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
