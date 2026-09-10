import {
    useEffect,
    useState,
    type ReactNode
} from "react";

import Sidebar from "../Sidebar";
import "./Layout.css";


interface Props {
    children: ReactNode;
}


function Layout({
    children
}: Props) {

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

            <Sidebar />

            <button
                type="button"
                className="theme-toggle"
                onClick={() =>
                    setDarkMode(
                        valor => !valor
                    )
                }
                title={
                    darkMode
                        ? "Ativar modo claro"
                        : "Ativar modo noturno"
                }
            >
                {darkMode
                    ? "☀️"
                    : "🌙"}
            </button>

            <main className="content">

                {children}

            </main>

        </div>

    );

}


export default Layout;