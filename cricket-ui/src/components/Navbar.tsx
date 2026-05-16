import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-green-400">
          Cricket Duniya
        </h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-slate-300">
          <Link to="/home" className="hover:text-green-400">
            Home
          </Link>
          <Link to="/matches" className="hover:text-green-400">
            Matches
          </Link>
          <Link to="/teams" className="hover:text-green-400">
            Teams
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden md:block bg-green-500 px-4 py-2 rounded-xl font-semibold"
          >
            Login
          </Link>

          {/* Mobile Button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden px-4 pb-4 space-y-3 text-slate-300">
          <Link onClick={() => setOpen(false)} to="/home" className="block">
            Home
          </Link>

          <Link onClick={() => setOpen(false)} to="/matches" className="block">
            Matches
          </Link>

          <Link onClick={() => setOpen(false)} to="/teams" className="block">
            Teams
          </Link>

          <Link
            onClick={() => setOpen(false)}
            to="/login"
            className="block bg-green-500 text-center py-2 rounded-xl text-white"
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}
