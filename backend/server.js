require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const authRoutes     = require("./routes/auth");
const userRoutes     = require("./routes/users");
const portalRoutes   = require("./routes/portals");
const auditRoutes    = require("./routes/audit");
const analyticsRoutes = require("./routes/analytics");
const linkedinRoutes  = require("./routes/linkedin");
const resumeRoutes    = require("./routes/resumes");
const applicationRoutes = require("./routes/applications");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Routes
app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/portals",   portalRoutes);
app.use("/api/audit",     auditRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/linkedin",     linkedinRoutes);
app.use("/api/resumes",      resumeRoutes);
app.use("/api/applications", applicationRoutes);

// Health check
app.get("/api/health", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 ConsultAdd API running on port ${PORT}`));
