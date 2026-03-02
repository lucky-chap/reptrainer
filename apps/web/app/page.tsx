import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PerformanceSection } from "@/components/landing/performance-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PerformanceSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
