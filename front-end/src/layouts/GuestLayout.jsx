import { AnnouncementBar, Header, Footer } from "../components";
import { Outlet } from "react-router";
 
function GuestLayout() {
    return <>
        <AnnouncementBar/>
        <Header/>
        <main>
            <Outlet></Outlet>
        </main>
        <Footer/>
    </>
}

export default GuestLayout;