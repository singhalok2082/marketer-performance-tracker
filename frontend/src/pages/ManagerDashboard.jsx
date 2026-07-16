import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PerformanceDashboard from "./PerformanceDashboard";

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return <PerformanceDashboard user={user} onLogout={handleLogout} />;
}
