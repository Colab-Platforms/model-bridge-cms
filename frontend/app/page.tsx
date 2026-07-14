import Navbar from "@/components/shared/Navbar";
import HeroSection from "@/components/landingPage/HeroSection";
import TrustSection from "@/components/landingPage/TrustSection";
import FeaturesSection from "@/components/landingPage/FeaturesSection";
import MultiModelSection from "@/components/landingPage/MultiModelSection";
import DeveloperSection from "@/components/landingPage/DeveloperSection";
import IntegrationsSection from "@/components/landingPage/IntegrationsSection";
import PricingSection from "@/components/pricing/PricingSection";
import Footer from "@/components/landingPage/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <HeroSection />
      <TrustSection />
      <FeaturesSection />
      <MultiModelSection />
      <DeveloperSection />
      <IntegrationsSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
