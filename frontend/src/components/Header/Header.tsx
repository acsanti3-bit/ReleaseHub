import "./Header.css";
import Clock from "../Clock";
import logo from "../../assets/images/logo.png";

function Header() {
  return (
    <header className="header">

      <div className="header-left">

        <img
          src={logo}
          alt="Logo IWS"
          className="logo"
        />

        <div>

          <h1>IWS Quality Hub</h1>

          <p>Central de Acompanhamento de Releases</p>

        </div>

      </div>

      <Clock />

    </header>
  );
}

export default Header;