import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Dashboard from "../pages/Dashboard/Dashboard";

import TvDashboard from "../pages/TvDashboard/TvDashboard";

import Projects from "../pages/Projects/Projects";

import Settings from "../pages/Settings/Settings";

import ReleaseEnvironments from "../pages/ReleaseEnvironments/ReleaseEnvironments";

function AppRoutes() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/projects"
          element={<Projects />}
        />

        <Route
          path="/environments"
          element={
            <ReleaseEnvironments />
          }
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/tv"
          element={<TvDashboard />}
        />

      </Routes>

    </BrowserRouter>

  );

}

export default AppRoutes;