import { useEffect, useRef } from "react";

function animateOpacity(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    el.style.opacity = String(from + (to - from) * t);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Full-bleed hero background video with a manual seamless crossfade loop:
// fades in on first frame, fades to black just before the clip ends, then
// resets and fades back in — hides the hard cut a native `loop` leaves.
export default function HeroVideo({ src, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onCanPlay = () => {
      el.play().catch(() => {});
      animateOpacity(el, 0, 1, 500);
    };
    const onTimeUpdate = () => {
      if (el.duration && el.duration - el.currentTime <= 0.55) {
        animateOpacity(el, parseFloat(el.style.opacity || "1"), 0, 500);
      }
    };
    const onEnded = () => {
      el.style.opacity = "0";
      setTimeout(() => {
        el.currentTime = 0;
        el.play().catch(() => {});
        animateOpacity(el, 0, 1, 500);
      }, 100);
    };

    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={`absolute inset-0 w-full h-full object-cover object-bottom ${className}`}
      style={{ opacity: 0 }}
      muted
      autoPlay
      playsInline
      preload="auto"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
