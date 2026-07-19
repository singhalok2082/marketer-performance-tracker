import React from "react";
import { motion } from "framer-motion";

function initials(name) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function TeamSection({ team, onSelectMember, onGetStarted }) {
  return (
    <section className="py-24 px-6 bg-caNeutral text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-black mb-3">
          14 Account Managers. One Dashboard.
        </h2>
        <p className="font-body text-caText/60 text-lg mb-12">Click your name to sign in.</p>
      </motion.div>

      <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto mb-12">
        {team.map((member, i) => (
          <motion.button
            key={member.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => onSelectMember(member)}
            className="inline-flex items-center gap-2.5 bg-white border border-gray-200 rounded-full pl-2 pr-5 py-2 font-body text-sm font-medium text-caText hover:border-caOrange hover:shadow-md transition-all duration-200"
          >
            <span className="w-7 h-7 rounded-full bg-caOrange/10 text-caOrange font-heading font-bold text-[11px] flex items-center justify-center">
              {initials(member.name)}
            </span>
            {member.name}
          </motion.button>
        ))}
      </div>

      <button
        onClick={onGetStarted}
        className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-body font-medium px-8 py-3.5 rounded-full transition-all duration-200 hover:scale-[1.02]"
      >
        Get your team started <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
