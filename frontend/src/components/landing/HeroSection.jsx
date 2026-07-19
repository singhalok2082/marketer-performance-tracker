import React from "react";
import { motion } from "framer-motion";
import { Link2, FileText, Briefcase } from "lucide-react";

export default function HeroSection({ onGetStarted }) {
  return (
    <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-white to-caNeutral">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.08] text-black mb-6">
            Bench recruiting,<br />
            <span className="text-caOrange">organized.</span>
          </h1>
          <p className="font-body text-lg text-caText/80 leading-relaxed max-w-lg mb-8">
            Log LinkedIn profiles, manage resumes, and track every job application — all in one place built for your team.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-caOrange hover:bg-caOrangeDark text-white font-body font-medium text-base px-8 py-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
          >
            Get Started <span aria-hidden="true">→</span>
          </button>
          <p className="font-body text-sm text-caText/50 mt-4">14 account managers. One dashboard.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Link2, color: "text-caBlue", bg: "bg-caBlue/10" },
                { icon: FileText, color: "text-caOrange", bg: "bg-caOrange/10" },
                { icon: Briefcase, color: "text-caTeal", bg: "bg-caTeal/10" },
              ].map(({ icon: Icon, color, bg }, i) => (
                <div key={i} className={`${bg} rounded-xl aspect-square flex items-center justify-center`}>
                  <Icon className={`${color} w-8 h-8`} strokeWidth={1.75} aria-hidden="true" />
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm font-body">
                <span className="text-caText/50 uppercase text-xs font-medium tracking-wide">Title</span>
                <span className="text-caText font-medium">Python Engineer</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-caText/50 uppercase text-xs font-medium tracking-wide">Location</span>
                <span className="text-caText font-medium">Remote, US</span>
              </div>
              <div className="flex justify-between text-sm font-body items-center">
                <span className="text-caText/50 uppercase text-xs font-medium tracking-wide">Status</span>
                <span className="bg-caTeal/10 text-caTeal font-semibold text-xs px-3 py-1 rounded-full">Active</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
