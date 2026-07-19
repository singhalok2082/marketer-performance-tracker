import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const ROWS = [
  "LinkedIn profile tracking",
  "Resume management & quick-view",
  "Job application tracking",
  "Daily performance metrics",
];

export default function ComparisonSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-heading font-bold text-3xl sm:text-4xl text-black text-center mb-14"
        >
          Before &amp; After ConsultAdd Tracker
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm"
        >
          <table className="w-full text-left font-body">
            <thead>
              <tr className="bg-caNeutral">
                <th className="py-4 px-6 font-heading font-semibold text-sm text-caText/70"></th>
                <th className="py-4 px-6 font-heading font-semibold text-sm text-caText/70">Without ConsultAdd</th>
                <th className="py-4 px-6 font-heading font-semibold text-sm text-caOrange bg-caOrange/5">With ConsultAdd</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row} className={i % 2 === 0 ? "bg-white" : "bg-caNeutral/50"}>
                  <td className="py-4 px-6 text-sm font-medium text-caText">{row}</td>
                  <td className="py-4 px-6"><X className="w-5 h-5 text-gray-300" aria-label="Not available" /></td>
                  <td className="py-4 px-6 bg-caOrange/5"><Check className="w-5 h-5 text-caOrange" strokeWidth={2.5} aria-label="Included" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
