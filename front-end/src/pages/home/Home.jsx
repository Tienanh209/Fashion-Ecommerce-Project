import {Hero, Testimonials, CategoryTiles} from "../../components"
import {BestSelling, NewArrivals} from "../../pages"
 
function Home() {
    return <>
        <Hero/>
        <BestSelling/>
        <NewArrivals/>
        <CategoryTiles/>
        <Testimonials/>
    </>
}

export default Home