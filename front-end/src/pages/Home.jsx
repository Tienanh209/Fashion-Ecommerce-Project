import AnnouncementBar from "../components/AnnouncementBar"
import Header from "../components/Header"
import Hero from "../components/Hero"
import Footer from "../components/Footer"
import BestSelling from "./BestSelling"
import NewArrivals from "./NewArrivals"
import Testimonials from "../components/Testimonials"
import CategoryTiles from "../components/CategoryTiles"
function Home() {
    return <>
        <AnnouncementBar/>
        <Header/>
        <Hero/>
        <BestSelling/>
        <NewArrivals/>
        <CategoryTiles/>
        <Testimonials/>
        <Footer/>
    </>
}

export default Home