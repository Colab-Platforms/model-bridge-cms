"use client";

import Link from "next/link";
import {useAuthStore} from "@/store/authStore";

export default function Navbar() {

 const user = useAuthStore((s)=> s.user) ;

const navlinks = [
  ...(user ? [{ label: "Home", href: "/dashboard" }] : []),
  { label: "Models", href: "/models" },
  { label: "Docs", href: "/docs" },
];


  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center font-bold">
            O
          </div>
          <span className="font-semibold text-white text-lg">
            ModelBridge CMS
          </span>
        </Link>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-sm mx-10">
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>

        {/* Navigation */}
        {
          navlinks.map((link) => {
            return (
              <Link href={link.href} key={link.label} className="text-gray-300 hover:text-white transition">
                {link.label}
              </Link>
            )
          })
        }

       {
        user ? (
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
            {user.firstName[0].toUpperCase()}
          </div>
        ) : (
          <Link href="/auth/login">
            <button className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-semibold transition" >
              Sign Up
            </button>
          </Link>
        )
       }
      </div>



    </header>
  );
}