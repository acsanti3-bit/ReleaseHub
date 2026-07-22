import type { ReactNode } from "react";
import Sidebar from "../Sidebar";
import "./Layout.css";

interface Props{
    children:ReactNode;
}

function Layout({children}:Props){

    return(

        <div className="layout">

            <Sidebar/>

            <main className="content">

                {children}

            </main>

        </div>

    )

}

export default Layout;