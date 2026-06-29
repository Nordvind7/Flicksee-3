import React from 'react';
import Footer from '../../components/Footer';
import Hero from './Hero';

const AboutLanding: React.FC = () => (
  <div className="min-h-screen bg-brand-background text-brand-secondary">
    <main>
      <Hero />
      {/* HowItWorks, BeforeAfter, FAQ, FinalCTA land in later tasks */}
    </main>
    <Footer />
  </div>
);

export default AboutLanding;
