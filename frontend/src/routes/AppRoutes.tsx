import {
  lazy,
  Suspense,
} from "react";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

const Dashboard =
  lazy(
    () =>
      import(
        "../pages/Dashboard/Dashboard"
      )
  );

const TvDashboard =
  lazy(
    () =>
      import(
        "../pages/TvDashboard/TvDashboard"
      )
  );

const Settings =
  lazy(
    () =>
      import(
        "../pages/Settings/Settings"
      )
  );

const ReleaseEnvironments =
  lazy(
    () =>
      import(
        "../pages/ReleaseEnvironments/ReleaseEnvironments"
      )
  );

const Login =
  lazy(
    () =>
      import(
        "../pages/Login/Login"
      )
  );


function AppRoutes() {

  return (

    <BrowserRouter>

      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily:
                "Arial, sans-serif",
              color: "#667085",
              fontSize: "14px",
            }}
          >
            Carregando...
          </div>
        }
      >

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

              <ProtectedRoute>

                <TvDashboard />

              </ProtectedRoute>

            }
          />

          <Route
            path="/"
            element={

              <ProtectedRoute
                requiredRoles={[
                  "admin",
                  "qualidade",
                ]}
              >

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
                requiredRoles={[
                  "admin",
                  "qualidade",
                ]}
              >

                <Settings />

              </ProtectedRoute>

            }
          />

        </Routes>

      </Suspense>

    </BrowserRouter>

  );

}

export default AppRoutes;
