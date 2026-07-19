import React from "react";
import { motion } from "framer-motion";

export default function CTASection({ onGetStarted }) {
  return (
    <section className="py-24 px-6 bg-gradient-to-r from-caOrange to-caBlue text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4">
          Ready to organize your bench recruiting?
        </h2>
        <p className="font-body text-white/90 text-lg mb-8">
          Start tracking LinkedIn profiles, resumes, and job applications today.
        </p>
        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 bg-white text-caText font-body font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
        >
          Get Started <span aria-hidden="true">→</span>
        </button>
      </motion.div>
    </section>
  );
}
