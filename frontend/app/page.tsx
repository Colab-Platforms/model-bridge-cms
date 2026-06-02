import Image from "next/image";
import Navbar from "@/components/shared/Navbar";

import "./globals.css";
import HeroSection from "@/components/landingPage/HeroSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
     
    </div>
  );
}
