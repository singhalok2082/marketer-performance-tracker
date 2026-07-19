import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-caOrange flex items-center justify-center text-white font-heading font-bold text-xs">CA</div>
          <span className="font-heading font-semibold text-sm text-caText">ConsultAdd Tracker</span>
        </div>

        <div className="flex items-center gap-6 font-body text-sm text-caText/60">
          <a href="#" className="hover:text-caOrange transition-colors">About</a>
          <a href="#" className="hover:text-caOrange transition-colors">Terms</a>
          <a href="#" className="hover:text-caOrange transition-colors">Privacy</a>
          <a href="#" className="hover:text-caOrange transition-colors">Contact</a>
        </div>

        <div className="font-body text-xs text-caText/40">© {new Date().getFullYear()} ConsultAdd. All rights reserved.</div>
      </div>
    </footer>
  );
}
