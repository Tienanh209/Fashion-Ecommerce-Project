import { Hero, Testimonials, CategoryTiles, BestSelling, NewArrivals } from "../../components"
 
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