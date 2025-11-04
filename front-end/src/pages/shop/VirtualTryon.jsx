import { SidebarTryon } from "../../components";

function VirtualTryon() {
    return <>
    <div className="flex">
        <aside className="hidden md:block">
            <SidebarTryon/>
        </aside>
        <div>
            image
        </div>
    </div>
    </>
}

export default VirtualTryon;