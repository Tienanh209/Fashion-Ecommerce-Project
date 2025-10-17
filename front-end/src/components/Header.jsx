import { NavLink } from "react-router";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        
        <div className="font-extrabold text-3xl tracking-tight">
          TA.<span className="text-gray-400">SHOP</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[18] font-medium text-gray-700">
          <NavLink to="/" className="relative group">
            Home
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full"></span>
          </NavLink>
          <NavLink to="/BestSelling" className="relative group">
            BestSelling
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full"></span>
          </NavLink>
          <NavLink href="#" className="relative group">
            New Arrivals
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full"></span>
          </NavLink>
          <NavLink href="#" className="relative group">
            On Sale
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full"></span>
          </NavLink>
          <NavLink href="#" className="relative group">
            Shop
            <span className="absolute bottom-[-4px] left-0 w-0 h-[2px] bg-black transition-all group-hover:w-full"></span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-4">

          <div className="hidden md:block relative z-10">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 focus-within:ring-1 focus-within:ring-black-300 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-500">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L20 21.49 21.49 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.505 4.505 0 0 1 9.5 14"
                />
              </svg>
              <input
                className="w-40 lg:w-56 outline-none text-sm bg-transparent placeholder:text-gray-400"
                placeholder="Search for products…"
              />
            </div>
          </div>

          <button aria-label="User" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          <button aria-label="Cart" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
