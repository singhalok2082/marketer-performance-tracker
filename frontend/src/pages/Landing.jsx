import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import ProblemSection from "../components/landing/ProblemSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import DashboardPreviewSection from "../components/landing/DashboardPreviewSection";
import TeamSection from "../components/landing/TeamSection";
import ComparisonSection from "../components/landing/ComparisonSection";
import FAQSection from "../components/landing/FAQSection";
import CTASection from "../components/landing/CTASection";
import Footer from "../components/landing/Footer";

export default function Landing() {
  const [team, setTeam] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      return;
    }
    api.get("/users/public").then(r => setTeam(r.data)).catch(() => {});
  }, [user, navigate]);

  const goToLogin = () => navigate("/login");
  const goToAdminLogin = () => navigate("/admin-login");
  const goToMemberLogin = (member) => navigate(`/login?email=${encodeURIComponent(member.email)}`);

  return (
    <div className="font-body text-caText bg-white overflow-x-hidden">
      <Navbar onAdminLogin={goToAdminLogin} />
      <HeroSection onGetStarted={goToLogin} />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DashboardPreviewSection />
      <TeamSection team={team} onSelectMember={goToMemberLogin} onGetStarted={goToLogin} />
      <ComparisonSection />
      <FAQSection />
      <CTASection onGetStarted={goToLogin} />
      <Footer />
    </div>
  );
}
