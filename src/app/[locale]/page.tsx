import { Navbar } from "./_components/navbar";
import { Hero } from "./_components/hero";
import { Stats } from "./_components/stats";
import { Features } from "./_components/features";
import { CtaSection } from "./_components/cta-section";
import { Footer } from "./_components/footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <CtaSection />
      <Footer />
    </main>
  );
}
