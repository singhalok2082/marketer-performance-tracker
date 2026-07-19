import React from "react";
import { motion } from "framer-motion";
import FAQAccordion from "./FAQAccordion";

const FAQS = [
  { q: "Who can use ConsultAdd Tracker?", a: "Any ConsultAdd account manager with login credentials, plus the admin, who can see activity across the whole team." },
  { q: "Is my resume data secure?", a: "Yes. Files are stored privately and only accessible to you and your admin — quick-view links expire after a short window." },
  { q: "Can I upload PDF and DOC files?", a: "Yes, resumes can be uploaded as PDF, DOC, or DOCX. PDFs preview inline; DOC/DOCX open in an embedded viewer." },
  { q: "How do I track job applications?", a: "Log the portal, job title, URL, description, candidate info, and the resume you used — all in one form." },
  { q: "What if I need help?", a: "Reach out to your admin — they can reset your password or check your records directly from the admin panel." },
];

export default function FAQSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-heading font-bold text-3xl sm:text-4xl text-black text-center mb-14"
        >
          Frequently Asked Questions
        </motion.h2>
        <FAQAccordion items={FAQS} defaultOpenIndex={0} />
      </div>
    </section>
  );
}
