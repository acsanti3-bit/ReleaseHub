import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Dashboard from "../pages/Dashboard/Dashboard";

import TvDashboard from "../pages/TvDashboard/TvDashboard";

import Settings from "../pages/Settings/Settings";

import ReleaseEnvironments from "../pages/ReleaseEnvironments/ReleaseEnvironments";

import Login from "../pages/Login/Login";

import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        <Route
          path="/tv"
          element={
            <TvDashboard />
          }
        />

        <Route
          path="/"
          element={

            <ProtectedRoute>

              <Dashboard />

            </ProtectedRoute>

          }
        />

        <Route
          path="/environments"
          element={

            <ProtectedRoute>

              <ReleaseEnvironments />

            </ProtectedRoute>

          }
        />

        <Route
          path="/settings"
          element={

            <ProtectedRoute
              requiredRole="admin"
            >

              <Settings />

            </ProtectedRoute>

          }
        />

      </Routes>

    </BrowserRouter>

  );

}

export default AppRoutes;