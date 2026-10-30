import {
    useEffect,
    useState
} from "react";

import {
    Outlet
} from "react-router-dom";

import Sidebar from "../Sidebar";
import "./Layout.css";


function Layout() {

    const [darkMode, setDarkMode] =
        useState(() => {
            return (
                localStorage.getItem(
                    "releasehub-theme"
                ) === "dark"
            );
        });


    useEffect(() => {

        document.documentElement
            .classList.toggle(
                "dark",
                darkMode
            );

        localStorage.setItem(
            "releasehub-theme",
            darkMode
                ? "dark"
                : "light"
        );

    }, [darkMode]);


    return (

        <div className="layout">

            <Sidebar
                darkMode={darkMode}
                onToggleTheme={() =>
                    setDarkMode(
                        valor => !valor
                    )
                }
            />

            <main className="content">

                <Outlet />

            </main>

        </div>

    );

}


export default Layout;