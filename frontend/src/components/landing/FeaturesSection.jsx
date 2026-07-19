import React from "react";
import { motion } from "framer-motion";
import { Link2, FileText, Briefcase, TrendingUp, LayoutDashboard, RefreshCw } from "lucide-react";

const FEATURES = [
  { icon: Link2, title: "LinkedIn Profiles", body: "Track URL, title, location, and connection count for every profile your team creates.", iconBg: "bg-caBlue/10", iconColor: "text-caBlue" },
  { icon: FileText, title: "Resume Management", body: "Upload, quick-view, and archive resumes without ever leaving the browser.", iconBg: "bg-caOrange/10", iconColor: "text-caOrange" },
  { icon: Briefcase, title: "Job Applications", body: "Log the portal, job URL, description, and candidate info for every application.", iconBg: "bg-caTeal/10", iconColor: "text-caTeal" },
  { icon: TrendingUp, title: "Daily Tracking", body: "See applications and submissions roll up by day, week, month, or custom range.", iconBg: "bg-caOrange/10", iconColor: "text-caOrange" },
  { icon: LayoutDashboard, title: "Admin Dashboard", body: "Review every account manager's activity in one place, filterable by person.", iconBg: "bg-caBlue/10", iconColor: "text-caBlue" },
  { icon: RefreshCw, title: "Real-time Sync", body: "Updates are visible the moment they're logged — no refresh, no waiting.", iconBg: "bg-caTeal/10", iconColor: "text-caTeal" },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-heading font-bold text-3xl sm:text-4xl text-black text-center mb-16"
        >
          Powerful Features for Your Team
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: (i % 3) * 0.1, duration: 0.45 }}
              className="p-7 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`${f.iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <f.icon className={`${f.iconColor} w-6 h-6`} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-black mb-2">{f.title}</h3>
              <p className="font-body text-sm text-caText/60 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
