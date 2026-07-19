import React from "react";
import { motion } from "framer-motion";
import { FolderX, FileWarning, ClipboardX, BarChart3 } from "lucide-react";

const PROBLEMS = [
  { icon: FolderX, title: "Scattered LinkedIn profiles across tools", body: "Profiles logged in chats, spreadsheets, and notes — never in one searchable place.", bg: "bg-caOrange/5", iconBg: "bg-caOrange/10", iconColor: "text-caOrange" },
  { icon: FileWarning, title: "Resume versions mixed up and lost", body: "The current resume is always in someone's inbox, never where you actually need it.", bg: "bg-caBlue/5", iconBg: "bg-caBlue/10", iconColor: "text-caBlue" },
  { icon: ClipboardX, title: "No way to track job applications", body: "Portal, status, and resume used for each application live in different places, if anywhere.", bg: "bg-caTeal/5", iconBg: "bg-caTeal/10", iconColor: "text-caTeal" },
  { icon: BarChart3, title: "Can't see daily performance metrics", body: "Without one shared view, managers can't see submission rates without asking directly.", bg: "bg-caOrange/5", iconBg: "bg-caOrange/10", iconColor: "text-caOrange" },
];

export default function ProblemSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-black mb-3">Sound familiar?</h2>
          <p className="font-body text-caText/60 text-lg">The daily friction of tracking bench recruiting by hand.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`${p.bg} rounded-xl p-6 border border-gray-100`}
            >
              <div className={`${p.iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <p.icon className={`${p.iconColor} w-6 h-6`} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="font-heading font-semibold text-base text-black mb-2 leading-snug">{p.title}</h3>
              <p className="font-body text-sm text-caText/60 leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
