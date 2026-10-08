import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { FeedbackPreview } from "@/components/marketing/FeedbackPreview";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Footer } from "@/components/marketing/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <FeedbackPreview />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}