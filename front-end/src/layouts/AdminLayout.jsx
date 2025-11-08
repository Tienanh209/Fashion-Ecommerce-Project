import DashboardHeader from "../components/admin/DashboardHeader";
import Sidebar from "../components/admin/Sidebar";
import { Outlet } from "react-router";

function AdminLayout() {
    return <>
        <div className="flex min-h-screen bg-neutral-50">
            <div>
            <aside className="hidden md:block sticky top-0">
                <Sidebar/>
            </aside>
            </div>
            <div className="flex flex-1 flex-col">
                <div className="sticky top-0 z-20">
                    <DashboardHeader/>
                </div>

                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet></Outlet>
                </main>
            </div>
        </div>
    </>
}

export default AdminLayout;