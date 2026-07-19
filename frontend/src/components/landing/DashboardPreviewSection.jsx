import React from "react";
import { motion } from "framer-motion";

const KPIS = [
  { label: "Total Applications", value: "186", color: "text-caOrange" },
  { label: "Client Submissions", value: "42", color: "text-caBlue" },
  { label: "Submission Rate", value: "23%", color: "text-caTeal" },
  { label: "Team Size", value: "14", color: "text-black" },
];

const ROWS = [
  { name: "Manager A", apps: 18, subs: 6, rate: "33%" },
  { name: "Manager B", apps: 14, subs: 4, rate: "29%" },
  { name: "Manager C", apps: 11, subs: 2, rate: "18%" },
];

export default function DashboardPreviewSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-black mb-3">Your Complete Dashboard</h2>
          <p className="font-body text-caText/60 text-lg mb-12 max-w-xl mx-auto">
            Overview KPIs, submission trends, portal breakdowns, and every team member's activity — all in one screen.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="bg-caNeutral rounded-2xl p-4 sm:p-8 shadow-inner text-left"
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
              {KPIS.map(k => (
                <div key={k.label} className="p-5">
                  <div className="font-body text-xs uppercase tracking-wide text-caText/40 mb-1">{k.label}</div>
                  <div className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</div>
                </div>
              ))}
            </div>
            <div className="p-5">
              <div className="font-heading font-semibold text-sm text-black mb-4">Team performance</div>
              <div className="space-y-3">
                {ROWS.map(r => (
                  <div key={r.name} className="flex items-center justify-between text-sm font-body">
                    <span className="text-caText font-medium">{r.name}</span>
                    <div className="flex items-center gap-6 text-caText/60">
                      <span>{r.apps} applications</span>
                      <span>{r.subs} submitted</span>
                      <span className="text-caOrange font-semibold">{r.rate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
