import React from "react";
import { motion } from "framer-motion";
import { Link2, Upload, ClipboardCheck } from "lucide-react";

const STEPS = [
  {
    num: "1",
    icon: Link2,
    title: "Log LinkedIn",
    body: "Account managers add LinkedIn profiles with URLs, titles, locations, and connection counts.",
    badgeBg: "bg-caBlue", iconBg: "bg-caBlue/10", iconColor: "text-caBlue",
  },
  {
    num: "2",
    icon: Upload,
    title: "Upload Resumes",
    body: "Upload PDF or DOC resumes with a quick preview, designation, and tech stack — no downloads needed.",
    badgeBg: "bg-caOrange", iconBg: "bg-caOrange/10", iconColor: "text-caOrange",
  },
  {
    num: "3",
    icon: ClipboardCheck,
    title: "Track Applications",
    body: "Log job applications with the portal URL, title, job description, and candidate info.",
    badgeBg: "bg-caTeal", iconBg: "bg-caTeal/10", iconColor: "text-caTeal",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-6 bg-caNeutral">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-heading font-bold text-3xl sm:text-4xl text-black text-center mb-16"
        >
          How ConsultAdd Tracker Works
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative"
            >
              <div className={`absolute -top-4 -left-2 w-9 h-9 rounded-full ${s.badgeBg} text-white font-heading font-bold text-sm flex items-center justify-center shadow-md`}>
                {s.num}
              </div>
              <div className={`w-14 h-14 rounded-xl ${s.iconBg} flex items-center justify-center mb-5 mt-2`}>
                <s.icon className={`${s.iconColor} w-7 h-7`} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-black mb-3">{s.title}</h3>
              <p className="font-body text-sm text-caText/60 leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
