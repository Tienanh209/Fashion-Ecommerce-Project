import { Header, Footer } from "../components";
import { Outlet } from "react-router";
 
function CustomerLayout() {
    return <>
        <Header/>
        <main>
            <Outlet></Outlet>
        </main>
        <Footer/>
    </>
}

export default CustomerLayout;