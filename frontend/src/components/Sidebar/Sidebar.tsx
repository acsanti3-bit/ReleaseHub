import {
  NavLink,
} from "react-router-dom";

import "./Sidebar.css";

function Sidebar() {

  return (

    <aside className="sidebar">

      <div className="sidebar-header">

        <h2>
          IWS ReleaseHub
        </h2>

        <span>
          v1.0.0
        </span>

      </div>

      <nav>

        <NavLink to="/">
          Dashboard
        </NavLink>

        <NavLink to="/projects">
          Projetos
        </NavLink>

        <NavLink to="/environments">
          Ambientes da Release
        </NavLink>

        <NavLink to="/tv">
          Modo TV
        </NavLink>

        <NavLink to="/settings">
          Configurações
        </NavLink>

      </nav>

    </aside>

  );

}

export default Sidebar;