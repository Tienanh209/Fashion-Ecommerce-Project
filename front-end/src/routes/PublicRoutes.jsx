import { BrowserRouter as Router, Routes, Route } from "react-router"

import Home from "../pages/Home"
import BestSelling from "../pages/BestSelling"

function PublicRoutes() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/BestSelling" element={<BestSelling/>}/>
            </Routes>
        </Router>
    )
}

export default PublicRoutes