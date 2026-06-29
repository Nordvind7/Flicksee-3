import React from 'react';
import Footer from '../../components/Footer';
import StickyTopBar from './StickyTopBar';
import Hero from './Hero';
import ProblemAgitation from './ProblemAgitation';
import HowItWorks from './HowItWorks';
import Comparison from './Comparison';
import MatchFeature from './MatchFeature';
import UseCases from './UseCases';
import FAQ from './FAQ';
import FinalCTA from './FinalCTA';

// Section order matches docs/superpowers/specs/2026-06-29-landing-v2-sales-design.md.
// Pain → Solution → Proof → Objection handling → CTA.
const AboutLanding: React.FC = () => (
  <div className="min-h-screen bg-brand-background text-brand-secondary">
    <StickyTopBar />
    <main>
      <Hero />
      <ProblemAgitation />
      <HowItWorks />
      <Comparison />
      <MatchFeature />
      <UseCases />
      <FAQ />
      <FinalCTA />
    </main>
    <FooterClaim />
    <Footer />
  </div>
);

// Content-volume claim that sits ABOVE the existing Footer (which keeps its
// links + TMDB attribution).
const FooterClaim: React.FC = () => (
  <section className="px-4 sm:px-8 py-12 bg-ink-900/60 border-t border-white/5">
    <div className="max-w-3xl mx-auto text-center">
      <p className="text-lg sm:text-xl font-bold mb-2">
        50 000+ фильмов и сериалов в одном месте.
      </p>
      <p className="text-sm opacity-70">
        Не нужно открывать 10 разных сайтов. Всё сохранено, всё свайпаемо,
        всё под рукой.
      </p>
    </div>
  </section>
);

export default AboutLanding;
