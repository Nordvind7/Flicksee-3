import React from 'react';
import Footer from '../../components/Footer';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import BeforeAfter from './BeforeAfter';
import FAQ from './FAQ';
import FinalCTA from './FinalCTA';

const AboutLanding: React.FC = () => (
  <div className="min-h-screen bg-brand-background text-brand-secondary">
    <main>
      <Hero />
      <HowItWorks />
      <BeforeAfter />
      <FAQ />
      <FinalCTA />
    </main>
    <Footer />
  </div>
);

export default AboutLanding;
