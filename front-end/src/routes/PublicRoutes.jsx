import { BrowserRouter as Router, Routes, Route } from "react-router"

import Home from "../pages/Home"

function PublicRoutes() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home/>}/>
            </Routes>
        </Router>
    )
}

export default PublicRoutes