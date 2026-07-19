import React from "react";

export default function Navbar({ onAdminLogin }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-caOrange flex items-center justify-center text-white font-heading font-bold text-sm">
            CA
          </div>
          <span className="font-heading font-bold text-lg text-caText">ConsultAdd Tracker</span>
        </div>
        <button
          onClick={onAdminLogin}
          className="font-body text-sm font-medium text-caText border border-gray-200 rounded-full px-5 py-2 hover:border-caOrange hover:text-caOrange transition-colors duration-200"
        >
          Admin Login
        </button>
      </div>
    </nav>
  );
}
