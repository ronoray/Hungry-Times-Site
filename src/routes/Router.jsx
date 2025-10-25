import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home'
import Menu from '../pages/Menu'
import Order from '../pages/Order'
import Gallery from '../pages/Gallery'
import Testimonials from '../pages/Testimonials'
import Contact from '../pages/Contact'
import Feedback from '../pages/Feedback'
import Reservation from '../pages/Reservation'
import Careers from '../pages/Careers'


export default function Router() {
return (
<Routes>
<Route path="/" element={<Home />} />
<Route path="/menu" element={<Menu />} />
<Route path="/order" element={<Order />} />
<Route path="/gallery" element={<Gallery />} />
<Route path="/testimonials" element={<Testimonials />} />
<Route path="/contact" element={<Contact />} />
<Route path="/feedback" element={<Feedback />} />
<Route path="/reservation" element={<Reservation />} />
<Route path="/careers" element={<Careers />} />
</Routes>
)
}