import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════
const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
let audioCtx = null;
const getAudio = () => { if (!audioCtx && AudioCtx) audioCtx = new AudioCtx(); return audioCtx; };

function playTap() {
  const c = getAudio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(880, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(1760, c.currentTime + 0.06);
  g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.1);
}
function playMiss() {
  const c = getAudio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(320, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.25);
  g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.25);
}
function playWrongColor() {
  const c = getAudio(); if (!c) return;
  const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o1.type = "square"; o2.type = "square"; o1.frequency.value = 180; o2.frequency.value = 190;
  g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  o1.connect(g); o2.connect(g); g.connect(c.destination);
  o1.start(); o2.start(); o1.stop(c.currentTime + 0.2); o2.stop(c.currentTime + 0.2);
}
function playRoundUp() {
  const c = getAudio(); if (!c) return;
  [0, 0.1, 0.2].forEach((d, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = 523 * (i + 1);
    g.gain.setValueAtTime(0.12, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 0.18);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.18);
  });
}
function playGameOver() {
  const c = getAudio(); if (!c) return;
  [0, 0.15, 0.3, 0.5].forEach((d, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = 400 - i * 80;
    g.gain.setValueAtTime(0.13, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 0.25);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.25);
  });
}
function playAchievement() {
  const c = getAudio(); if (!c) return;
  [0, 0.08, 0.16, 0.28].forEach((d, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = [659, 784, 988, 1319][i];
    g.gain.setValueAtTime(0.14, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 0.22);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.22);
  });
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const DOTS_PER_ROUND = 10;
const BASE_TIME_MS = 2200;
const TIME_DECREASE = 180;
const MIN_TIME_MS = 600;
const MAX_MISSES = 3;
const DOT_SIZE = 56;
const DOT_SIZE_SM = 46;
const DECOY_COLORS = ["#FF4D6A", "#FFB830", "#9B6DFF", "#FF6B35", "#E84393"];
const TARGET_COLOR_MODE2 = "#00E676";
const rand = (a, b) => Math.random() * (b - a) + a;

const ALL_COLORS = [
  { id: "cyan", hex: "#00E5FF", name: "Cyan" }, { id: "green", hex: "#00E676", name: "Green" },
  { id: "pink", hex: "#FF4D6A", name: "Pink" }, { id: "amber", hex: "#FFB830", name: "Amber" },
  { id: "purple", hex: "#9B6DFF", name: "Purple" }, { id: "orange", hex: "#FF6B35", name: "Orange" },
  { id: "magenta", hex: "#E84393", name: "Magenta" }, { id: "lime", hex: "#A8E600", name: "Lime" },
];

function getPos(w, h, sz) { const p = sz / 2 + 8; return { x: rand(p, w - p), y: rand(p, h - p) }; }
function getNonOverlapping(count, w, h, sz) {
  const pts = []; let tries = 0;
  while (pts.length < count && tries < 300) {
    const p = getPos(w, h, sz);
    if (pts.every(q => Math.hypot(p.x - q.x, p.y - q.y) > sz + 6)) pts.push(p);
    tries++;
  }
  while (pts.length < count) pts.push(getPos(w, h, sz));
  return pts;
}

// ═══════════════════════════════════════════
// ACHIEVEMENT SYSTEM
// ═══════════════════════════════════════════

// Custom SVG icons — geometric badges, no emojis
const ICONS = {
  diamond: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  bolt: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  shield: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  star: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8.5L22 9.3L17 14L18.2 21L12 17.5L5.8 21L7 14L2 9.3L9 8.5L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  crown: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18H21V20H3V18ZM3 18L5 8L9 12L12 4L15 12L19 8L21 18H3Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  eye: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5C5 5 2 12 2 12C2 12 5 19 12 19C19 19 22 12 22 12C22 12 19 5 12 5Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/><circle cx="12" cy="12" r="3" stroke="${color}" stroke-width="1.5" fill="${color}44"/></svg>`,
  hex: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  flame: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 2 7 8 7 13C7 16.3 9.2 19 12 19C14.8 19 17 16.3 17 13C17 8 12 2 12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/><path d="M12 12C12 12 10 14 10 15.5C10 16.9 10.9 18 12 18C13.1 18 14 16.9 14 15.5C14 14 12 12 12 12Z" stroke="${color}" stroke-width="1.5" fill="${color}44"/></svg>`,
  target: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.5" fill="${color}11"/><circle cx="12" cy="12" r="5.5" stroke="${color}" stroke-width="1.2" fill="${color}22"/><circle cx="12" cy="12" r="2" fill="${color}"/></svg>`,
  infinity: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 12C7 12 4 8.5 4 12C4 15.5 7 15.5 9 12C11 8.5 12 8.5 15 12C18 15.5 20 15.5 20 12C20 8.5 17 12 17 12" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`,
  triangle: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L22 20H2L12 3Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  compass: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.5" fill="${color}11"/><path d="M16 8L14 14L8 16L10 10L16 8Z" stroke="${color}" stroke-width="1.2" fill="${color}33"/></svg>`,
};

const ACHIEVEMENT_DEFS = [
  // Score milestones
  { id: "first_point", name: "First Strike", desc: "Score your first point", icon: "diamond", color: "#00E5FF", tier: "bronze",
    check: (s) => s.totalScore >= 1 },
  { id: "score_25", name: "Quarter Century", desc: "Score 25 points in a single game", icon: "bolt", color: "#FFB830", tier: "bronze",
    check: (s, g) => g && g.score >= 25 },
  { id: "score_50", name: "Half Hundred", desc: "Score 50 points in a single game", icon: "star", color: "#FFB830", tier: "silver",
    check: (s, g) => g && g.score >= 50 },
  { id: "score_100", name: "Centurion", desc: "Score 100 points in a single game", icon: "crown", color: "#FFB830", tier: "gold",
    check: (s, g) => g && g.score >= 100 },
  // Round milestones
  { id: "round_3", name: "Getting Warmer", desc: "Reach round 3", icon: "flame", color: "#FF6B35", tier: "bronze",
    check: (s, g) => g && g.round >= 3 },
  { id: "round_5", name: "Deep Focus", desc: "Reach round 5", icon: "eye", color: "#9B6DFF", tier: "silver",
    check: (s, g) => g && g.round >= 5 },
  { id: "round_8", name: "Tunnel Vision", desc: "Reach round 8", icon: "target", color: "#E84393", tier: "gold",
    check: (s, g) => g && g.round >= 8 },
  // Perfection
  { id: "perfect_round", name: "Flawless", desc: "Complete a round with zero misses", icon: "shield", color: "#00E676", tier: "silver",
    check: (s, g) => g && g.perfectRound },
  { id: "perfect_3", name: "Untouchable", desc: "Complete 3 consecutive flawless rounds", icon: "shield", color: "#00E5FF", tier: "gold",
    check: (s) => s.maxPerfectStreak >= 3 },
  // Games played
  { id: "games_5", name: "Regular", desc: "Play 5 games", icon: "hex", color: "#8a8aaa", tier: "bronze",
    check: (s) => s.gamesPlayed >= 5 },
  { id: "games_20", name: "Dedicated", desc: "Play 20 games", icon: "hex", color: "#9B6DFF", tier: "silver",
    check: (s) => s.gamesPlayed >= 20 },
  { id: "games_50", name: "Obsessed", desc: "Play 50 games", icon: "infinity", color: "#E84393", tier: "gold",
    check: (s) => s.gamesPlayed >= 50 },
  // Mode-specific
  { id: "mode_classic", name: "Purist", desc: "Score 30+ in Classic mode", icon: "diamond", color: "#00E5FF", tier: "silver",
    check: (s, g) => g && g.mode === 1 && g.score >= 30 },
  { id: "mode_color", name: "Color Blind", desc: "Score 30+ in Color Filter", icon: "triangle", color: "#00E676", tier: "silver",
    check: (s, g) => g && g.mode === 2 && g.score >= 30 },
  { id: "mode_dual", name: "Dual Wielder", desc: "Score 30+ in Dual Hunt", icon: "compass", color: "#E84393", tier: "silver",
    check: (s, g) => g && g.mode === 3 && g.score >= 30 },
  { id: "all_modes", name: "Versatile", desc: "Play all 3 game modes", icon: "star", color: "#FFB830", tier: "gold",
    check: (s) => s.modesPlayed && s.modesPlayed.length >= 3 },
];

const TIER_BORDER = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700" };

function defaultStats() {
  return { totalScore: 0, gamesPlayed: 0, maxPerfectStreak: 0, currentPerfectStreak: 0, modesPlayed: [] };
}

function checkNewAchievements(stats, gameResult, unlockedIds) {
  const newlyUnlocked = [];
  for (const a of ACHIEVEMENT_DEFS) {
    if (unlockedIds.includes(a.id)) continue;
    if (a.check(stats, gameResult)) newlyUnlocked.push(a);
  }
  return newlyUnlocked;
}

// ═══════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════
const themes = {
  dark: {
    bg: "linear-gradient(165deg, #0a0a1a 0%, #12122a 40%, #0d0d20 100%)",
    surface: "#0e0e22", surfaceGrad: "linear-gradient(180deg, #0e0e22 0%, #0a0a18 100%)",
    border: "#1a1a2e", text: "#e0e0f0", textDim: "#8a8aaa", textMuted: "#6a6a8a",
    dotGrid: "#ffffff06", barBg: "#1a1a2e", missOff: "#2a2a4a",
    inputBg: "#1a1a2e", inputBorder: "#2a2a4a", cardBg: "#12122a",
    toggleBg: "#1a1a2e", toggleKnob: "#e0e0f0",
    privacyBg: "#0e0e1e", privacyBorder: "#1a1a2e", btnText: "#0a0a1a",
  },
  light: {
    bg: "linear-gradient(165deg, #f0f0f8 0%, #e8e8f4 40%, #f4f4fc 100%)",
    surface: "#ffffff", surfaceGrad: "linear-gradient(180deg, #ffffff 0%, #f6f6fc 100%)",
    border: "#d8d8e8", text: "#1a1a2e", textDim: "#5a5a7a", textMuted: "#8a8aa0",
    dotGrid: "#00000008", barBg: "#e0e0ec", missOff: "#d0d0e0",
    inputBg: "#f4f4fc", inputBorder: "#d0d0e0", cardBg: "#f0f0f8",
    toggleBg: "#d8d8e8", toggleKnob: "#1a1a2e",
    privacyBg: "#f8f8ff", privacyBorder: "#e0e0ec", btnText: "#ffffff",
  },
};

// ═══════════════════════════════════════════
// STORAGE (localStorage for native/web)
// ═══════════════════════════════════════════
const STORAGE_KEY = "dot-hunter-data";
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveData(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
  catch (e) { console.error("Save failed:", e); }
}

// ═══════════════════════════════════════════
// FLOATING BACKGROUND DOTS
// ═══════════════════════════════════════════
const FLOAT_DOTS = [
  { size: 80, color: "#00E5FF", x: "10%", y: "15%", dur: "18s", delay: "0s", dx: 40, dy: 60 },
  { size: 50, color: "#9B6DFF", x: "75%", y: "10%", dur: "22s", delay: "-4s", dx: -30, dy: 50 },
  { size: 120, color: "#E84393", x: "60%", y: "65%", dur: "25s", delay: "-8s", dx: -50, dy: -40 },
  { size: 35, color: "#00E676", x: "20%", y: "70%", dur: "20s", delay: "-2s", dx: 60, dy: -30 },
  { size: 65, color: "#FFB830", x: "85%", y: "45%", dur: "23s", delay: "-6s", dx: -40, dy: 45 },
  { size: 45, color: "#FF4D6A", x: "40%", y: "85%", dur: "19s", delay: "-10s", dx: 35, dy: -55 },
  { size: 90, color: "#00E5FF", x: "50%", y: "30%", dur: "26s", delay: "-12s", dx: -45, dy: 35 },
  { size: 30, color: "#9B6DFF", x: "5%", y: "50%", dur: "21s", delay: "-3s", dx: 50, dy: 40 },
];

function FloatingDots({ isDark }) {
  const opacity = isDark ? 0.06 : 0.08;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {FLOAT_DOTS.map((d, i) => (
        <div key={i} style={{
          position: "absolute", left: d.x, top: d.y, width: d.size, height: d.size,
          borderRadius: "50%", background: d.color, opacity,
          animation: `floatDot${i} ${d.dur} ease-in-out infinite`,
          animationDelay: d.delay,
          filter: `blur(${d.size > 70 ? 8 : 4}px)`,
        }} />
      ))}
      <style>{FLOAT_DOTS.map((d, i) => `
        @keyframes floatDot${i} {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(${d.dx}px, ${d.dy * 0.6}px) scale(1.08); }
          50% { transform: translate(${d.dx * 0.5}px, ${d.dy}px) scale(0.95); }
          75% { transform: translate(${-d.dx * 0.3}px, ${d.dy * 0.4}px) scale(1.04); }
        }
      `).join("")}</style>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════
function Dot({ dot, onTap, small }) {
  const [scale, setScale] = useState(0);
  const sz = small ? DOT_SIZE_SM : DOT_SIZE;
  useEffect(() => { requestAnimationFrame(() => setScale(1)); }, []);
  return <div style={{
    position: "absolute", left: dot.x - sz / 2, top: dot.y - sz / 2, width: sz, height: sz, borderRadius: "50%", background: dot.color,
    boxShadow: `0 0 16px ${dot.color}88, 0 0 32px ${dot.color}44`, transform: `scale(${scale})`,
    transition: "transform 0.14s cubic-bezier(.4,0,.2,1)", cursor: "pointer", zIndex: 10, WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
  }} onPointerDown={() => onTap(dot)} />;
}

function TimerBar({ timeLeft, maxTime, color, t }) {
  const pct = Math.max(0, timeLeft / maxTime) * 100;
  return <div style={{ width: "100%", height: 4, background: t.barBg, borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
    <div style={{ height: "100%", width: `${pct}%`, background: pct > 30 ? color : "#FF4D6A", transition: "width 0.05s linear, background 0.3s", borderRadius: 2 }} />
  </div>;
}

function MissIndicator({ misses, max, t }) {
  return <div style={{ display: "flex", gap: 6 }}>
    {Array.from({ length: max }).map((_, i) => <div key={i} style={{
      width: 10, height: 10, borderRadius: "50%", background: i < misses ? "#FF4D6A" : t.missOff,
      transition: "background 0.3s", boxShadow: i < misses ? "0 0 6px #FF4D6A88" : "none",
    }} />)}
  </div>;
}

function Ripple({ x, y, color }) {
  return <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: "50%", border: `2px solid ${color}`, animation: "rippleOut 0.4s ease-out forwards", pointerEvents: "none", zIndex: 20 }} />;
}

function ThemeToggle({ isDark, onToggle, t }) {
  return <button onClick={onToggle} aria-label="Toggle theme" style={{
    position: "relative", width: 52, height: 28, borderRadius: 14, background: t.toggleBg, border: `1.5px solid ${t.border}`, cursor: "pointer", padding: 0,
  }}><div style={{ position: "absolute", top: 3, left: isDark ? 3 : 25, width: 20, height: 20, borderRadius: "50%", background: t.toggleKnob, transition: "left 0.25s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{isDark ? "🌙" : "☀️"}</div></button>;
}

function PrivacyBadge({ t, onTap }) {
  return <button onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 6, background: t.privacyBg, border: `1px solid ${t.privacyBorder}`, borderRadius: 20, padding: "5px 12px 5px 8px", color: t.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/></svg> Data stored locally
  </button>;
}

function PrivacyModal({ t, onClose }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeSlideUp 0.3s ease" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 20, padding: "32px 28px", maxWidth: 380, width: "100%", border: `1px solid ${t.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", color: t.text }}>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/></svg> Your Privacy
      </div>
      <div style={{ fontSize: 14, color: t.textDim, lineHeight: 1.7, marginBottom: 20 }}>All your game data — scores, achievements, settings — is saved exclusively on your device. Nothing is transmitted to any server or shared with third parties.</div>
      <div style={{ background: t.privacyBg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${t.privacyBorder}`, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.8 }}><div>✓ Scores saved to device only</div><div>✓ No accounts or sign-ins</div><div>✓ No analytics or tracking</div><div>✓ Clear data anytime from menu</div></div>
      </div>
      <button onClick={onClose} style={{ width: "100%", padding: "12px 0", background: t.text, color: t.surface, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>Got it</button>
    </div>
  </div>;
}

// Achievement badge component
function AchievementBadge({ achievement, unlocked, t, size = 40 }) {
  const iconSvg = ICONS[achievement.icon] ? ICONS[achievement.icon](unlocked ? achievement.color : t.textMuted + "66") : "";
  return <div style={{
    width: size, height: size, borderRadius: size * 0.28, display: "flex", alignItems: "center", justifyContent: "center",
    background: unlocked ? `${achievement.color}15` : `${t.textMuted}08`,
    border: `1.5px solid ${unlocked ? TIER_BORDER[achievement.tier] : t.border}`,
    opacity: unlocked ? 1 : 0.4, transition: "all 0.3s",
    boxShadow: unlocked ? `0 0 12px ${achievement.color}22` : "none",
  }}>
    <div style={{ width: size * 0.55, height: size * 0.55 }} dangerouslySetInnerHTML={{ __html: iconSvg }} />
  </div>;
}

// Toast notification for newly unlocked achievements
function AchievementToast({ achievement, t, onDone }) {
  useEffect(() => { const tm = setTimeout(onDone, 3500); return () => clearTimeout(tm); }, [onDone]);
  return <div style={{
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 2000,
    background: t.surface, border: `1.5px solid ${TIER_BORDER[achievement.tier]}`,
    borderRadius: 16, padding: "12px 20px", display: "flex", alignItems: "center", gap: 14,
    boxShadow: `0 8px 30px rgba(0,0,0,0.3), 0 0 20px ${achievement.color}22`,
    animation: "toastIn 0.4s cubic-bezier(.2,1,.3,1), toastOut 0.3s ease 3.2s forwards",
    maxWidth: 360,
  }}>
    <AchievementBadge achievement={achievement} unlocked={true} t={t} size={36} />
    <div>
      <div style={{ fontSize: 10, color: TIER_BORDER[achievement.tier], letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Unlocked</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>{achievement.name}</div>
      <div style={{ fontSize: 11, color: t.textDim }}>{achievement.desc}</div>
    </div>
  </div>;
}

// Achievements panel (trophy room)
function AchievementsPanel({ t, unlockedIds, onClose }) {
  const unlocked = ACHIEVEMENT_DEFS.filter(a => unlockedIds.includes(a.id));
  const locked = ACHIEVEMENT_DEFS.filter(a => !unlockedIds.includes(a.id));
  const pct = Math.round((unlocked.length / ACHIEVEMENT_DEFS.length) * 100);

  return <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeSlideUp 0.3s ease" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 20, padding: "28px 24px", maxWidth: 400, width: "100%", maxHeight: "85vh", overflowY: "auto", border: `1px solid ${t.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", color: t.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800 }}>Achievements</div>
        <div style={{ fontSize: 13, color: t.textDim }}>{unlocked.length}/{ACHIEVEMENT_DEFS.length}</div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", height: 6, background: t.barBg, borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #00E5FF, #9B6DFF, #E84393)", borderRadius: 3, transition: "width 0.5s" }} />
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && <>
        <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Unlocked</div>
        {unlocked.map(a => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
          <AchievementBadge achievement={a} unlocked={true} t={t} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{a.name}</div>
            <div style={{ fontSize: 11, color: t.textDim }}>{a.desc}</div>
          </div>
          <div style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: `${TIER_BORDER[a.tier]}22`, color: TIER_BORDER[a.tier], fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{a.tier}</div>
        </div>)}
      </>}

      {/* Locked */}
      {locked.length > 0 && <>
        <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, marginTop: 16 }}>Locked</div>
        {locked.map(a => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${t.border}`, opacity: 0.5 }}>
          <AchievementBadge achievement={a} unlocked={false} t={t} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textDim }}>???</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>{a.desc}</div>
          </div>
          <div style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: `${t.textMuted}15`, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{a.tier}</div>
        </div>)}
      </>}

      <button onClick={onClose} style={{ width: "100%", padding: "12px 0", background: t.text, color: t.surface, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginTop: 20 }}>Close</button>
    </div>
  </div>;
}

const MODE_LABELS = { 1: "CLS", 2: "CLR", 3: "DUO" };
const MODE_COLORS_TAG = { 1: "#00E5FF", 2: "#00E676", 3: "#E84393" };

const MODE_INSTRUCTIONS = {
  1: { title: "Classic Focus", rule: "Tap each dot before it disappears.", tip: "Speed increases every round. Miss 3 and it's over." },
  2: { title: "Color Filter", rule: "Tap only the green dots. Ignore all other colors.", tip: "Decoys will try to distract you. Stay sharp." },
  3: { title: "Dual Hunt", rule: "Tap only your 2 chosen colors. Ignore the rest.", tip: "Multiple dots appear at once. Clear your colors before time runs out." },
};

function ScoreHistory({ recentGames, t }) {
  if (!recentGames || recentGames.length === 0) return null;
  const last5 = recentGames.slice(-5).reverse();
  return <div style={{ width: "100%", background: t.cardBg, borderRadius: 14, border: `1px solid ${t.border}`, padding: "14px 16px", marginBottom: 16 }}>
    <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Recent Games</div>
    {last5.map((g, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < last5.length - 1 ? `1px solid ${t.border}` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: `${MODE_COLORS_TAG[g.mode]}18`, color: MODE_COLORS_TAG[g.mode], fontWeight: 600 }}>{MODE_LABELS[g.mode] || "???"}</span>
        <span style={{ fontSize: 13, color: t.textDim }}>R{g.round}</span>
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: t.text }}>{g.score}</span>
    </div>)}
  </div>;
}

// ═══════════════════════════════════════════
// MAIN GAME
// ═══════════════════════════════════════════
export default function FocusDotGame() {
  const [screen, setScreen] = useState("menu");
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [dotsCleared, setDotsCleared] = useState(0);
  const [dots, setDots] = useState([]);
  const [ripples, setRipples] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showFlash, setShowFlash] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const [gameData, setGameData] = useState({ classicHigh: 0, colorHigh: 0, dualHigh: 0, recentGames: [], theme: "dark", playerName: "", achievements: [], stats: defaultStats() });
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pickedColors, setPickedColors] = useState([]);
  const [targetsLeft, setTargetsLeft] = useState(0);
  const [toastQueue, setToastQueue] = useState([]);
  // Track misses-this-round for perfect round detection
  const [roundMisses, setRoundMisses] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);

  const t = isDark ? themes.dark : themes.light;

  const fieldRef = useRef(null); const timerRef = useRef(null); const dotTimerRef = useRef(null); const tickRef = useRef(null);
  const roundRef = useRef(round); const missRef = useRef(misses); const dotsClearedRef = useRef(dotsCleared);
  const scoreRef = useRef(score); const activeRef = useRef(false); const modeRef = useRef(mode);
  const gameDataRef = useRef(gameData); const pickedRef = useRef(pickedColors); const targetsLeftRef = useRef(targetsLeft);
  const roundMissesRef = useRef(roundMisses); const perfectStreakRef = useRef(perfectStreak);

  roundRef.current = round; missRef.current = misses; dotsClearedRef.current = dotsCleared;
  scoreRef.current = score; modeRef.current = mode; gameDataRef.current = gameData;
  pickedRef.current = pickedColors; targetsLeftRef.current = targetsLeft;
  roundMissesRef.current = roundMisses; perfectStreakRef.current = perfectStreak;

  useEffect(() => {
    const saved = loadData();
    if (saved) {
      if (!saved.stats) saved.stats = defaultStats();
      if (!saved.achievements) saved.achievements = [];
      setGameData(saved); setIsDark(saved.theme !== "light"); if (saved.playerName) setPlayerName(saved.playerName);
    }
    setLoaded(true);
  }, []);

  const persistAll = useCallback((ov = {}) => {
    const next = { ...gameDataRef.current, ...ov }; setGameData(next); gameDataRef.current = next; saveData(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => { const n = !prev; persistAll({ theme: n ? "dark" : "light" }); return n; });
  }, [persistAll]);

  const processAchievements = useCallback((gameResult) => {
    const d = { ...gameDataRef.current };
    const stats = { ...(d.stats || defaultStats()) };

    // Update stats
    stats.totalScore = (stats.totalScore || 0) + gameResult.score;
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    if (!stats.modesPlayed) stats.modesPlayed = [];
    if (!stats.modesPlayed.includes(gameResult.mode)) stats.modesPlayed.push(gameResult.mode);

    // Perfect streak
    if (gameResult.perfectRound) {
      stats.currentPerfectStreak = (stats.currentPerfectStreak || 0) + 1;
      stats.maxPerfectStreak = Math.max(stats.maxPerfectStreak || 0, stats.currentPerfectStreak);
    }

    d.stats = stats;

    // Check achievements
    const unlocked = d.achievements || [];
    const newOnes = checkNewAchievements(stats, gameResult, unlocked);

    if (newOnes.length > 0) {
      d.achievements = [...unlocked, ...newOnes.map(a => a.id)];
      // Queue toasts
      setToastQueue(prev => [...prev, ...newOnes]);
      playAchievement();
    }

    // Update highs
    d.recentGames = [...(d.recentGames || []), { score: gameResult.score, round: gameResult.round, mode: gameResult.mode, date: Date.now() }].slice(-20);
    if (gameResult.mode === 1 && gameResult.score > (d.classicHigh || 0)) d.classicHigh = gameResult.score;
    if (gameResult.mode === 2 && gameResult.score > (d.colorHigh || 0)) d.colorHigh = gameResult.score;
    if (gameResult.mode === 3 && gameResult.score > (d.dualHigh || 0)) d.dualHigh = gameResult.score;

    setGameData(d); gameDataRef.current = d; saveData(d);
  }, []);

  const clearAllData = useCallback(() => {
    const empty = { classicHigh: 0, colorHigh: 0, dualHigh: 0, recentGames: [], theme: isDark ? "dark" : "light", playerName, achievements: [], stats: defaultStats() };
    setGameData(empty); gameDataRef.current = empty; saveData(empty);
  }, [isDark, playerName]);

  const currentHigh = mode === 1 ? (gameData.classicHigh || 0) : mode === 2 ? (gameData.colorHigh || 0) : (gameData.dualHigh || 0);
  const unlockedCount = (gameData.achievements || []).length;

  const getTimeForRound = useCallback((r) => Math.max(MIN_TIME_MS, BASE_TIME_MS - (r - 1) * TIME_DECREASE), []);
  const getFieldDims = useCallback(() => { if (!fieldRef.current) return { w: 300, h: 400 }; const r = fieldRef.current.getBoundingClientRect(); return { w: r.width, h: r.height }; }, []);
  const clearTimers = useCallback(() => { clearTimeout(timerRef.current); clearTimeout(dotTimerRef.current); clearInterval(tickRef.current); }, []);

  const endGame = useCallback((finalScore, finalRound, gameMode) => {
    const perfectRound = roundMissesRef.current === 0 && dotsClearedRef.current > 0;
    const ps = perfectRound ? perfectStreakRef.current + 1 : 0;
    processAchievements({ score: finalScore, round: finalRound, mode: gameMode, perfectRound, perfectStreak: ps });
  }, [processAchievements]);

  // Track round completion for perfect streak
  const onRoundComplete = useCallback(() => {
    const wasPerfect = roundMissesRef.current === 0;
    if (wasPerfect) {
      const ns = perfectStreakRef.current + 1;
      setPerfectStreak(ns); perfectStreakRef.current = ns;
      // Check perfect streak achievements mid-game
      const d = { ...gameDataRef.current };
      const stats = { ...(d.stats || defaultStats()) };
      stats.currentPerfectStreak = ns;
      stats.maxPerfectStreak = Math.max(stats.maxPerfectStreak || 0, ns);
      d.stats = stats;
      const newOnes = checkNewAchievements(stats, { perfectRound: true }, d.achievements || []);
      if (newOnes.length > 0) { d.achievements = [...(d.achievements || []), ...newOnes.map(a => a.id)]; setToastQueue(prev => [...prev, ...newOnes]); playAchievement(); }
      setGameData(d); gameDataRef.current = d; saveData(d);
    } else {
      setPerfectStreak(0); perfectStreakRef.current = 0;
    }
    setRoundMisses(0); roundMissesRef.current = 0;
  }, []);

  // ========== MODE 3 ==========
  const spawnMode3Wave = useCallback((currentRound) => {
    if (!activeRef.current) return;
    const { w, h } = getFieldDims(); const timeMs = getTimeForRound(currentRound); const picked = pickedRef.current;
    const totalDots = Math.min(4 + currentRound, 12); const targetCount = Math.max(2, Math.floor(totalDots * 0.4)); const decoyCount = totalDots - targetCount;
    const positions = getNonOverlapping(totalDots, w, h, DOT_SIZE_SM);
    const decoyPool = ALL_COLORS.filter(c => !picked.includes(c.hex)).map(c => c.hex);
    const newDots = [];
    for (let i = 0; i < targetCount; i++) { newDots.push({ id: Date.now() + Math.random() + i, x: positions[i].x, y: positions[i].y, color: picked[Math.floor(Math.random() * picked.length)], isTarget: true }); }
    for (let i = 0; i < decoyCount; i++) { newDots.push({ id: Date.now() + Math.random() + targetCount + i, x: positions[targetCount + i].x, y: positions[targetCount + i].y, color: decoyPool[Math.floor(Math.random() * decoyPool.length)], isTarget: false }); }
    setDots(newDots); setTargetsLeft(targetCount); targetsLeftRef.current = targetCount; setTimeLeft(timeMs);
    clearInterval(tickRef.current); const startT = Date.now();
    tickRef.current = setInterval(() => { setTimeLeft(Math.max(0, timeMs - (Date.now() - startT))); }, 30);
    clearTimeout(dotTimerRef.current);
    dotTimerRef.current = setTimeout(() => {
      if (!activeRef.current) return; clearInterval(tickRef.current);
      const remaining = targetsLeftRef.current;
      if (remaining > 0) { playMiss(); const nm = missRef.current + remaining; setMisses(nm); setRoundMisses(r => r + remaining); roundMissesRef.current += remaining; setShowFlash("miss"); setTimeout(() => setShowFlash(null), 300);
        if (nm >= MAX_MISSES) { activeRef.current = false; setDots([]); playGameOver(); endGame(scoreRef.current, roundRef.current, modeRef.current); setScreen("gameOver"); return; }
      }
      const nc = dotsClearedRef.current + 1; setDotsCleared(nc); setDots([]);
      if (nc >= DOTS_PER_ROUND) { activeRef.current = false; playRoundUp(); onRoundComplete(); setScreen("roundEnd"); }
      else setTimeout(() => spawnMode3Wave(currentRound), 400);
    }, timeMs);
  }, [getFieldDims, getTimeForRound, endGame, onRoundComplete]);

  // ========== MODE 1 & 2 ==========
  const spawnDot = useCallback((currentRound, currentMode) => {
    if (!activeRef.current) return;
    if (currentMode === 3) { spawnMode3Wave(currentRound); return; }
    const { w, h } = getFieldDims(); const pos = getPos(w, h, DOT_SIZE); const timeMs = getTimeForRound(currentRound);
    let color; if (currentMode === 1) color = "#00E5FF"; else { const isDecoy = Math.random() < 0.3 + Math.min(currentRound * 0.03, 0.25); color = isDecoy ? DECOY_COLORS[Math.floor(Math.random() * DECOY_COLORS.length)] : TARGET_COLOR_MODE2; }
    const newDot = { id: Date.now() + Math.random(), x: pos.x, y: pos.y, color, isTarget: currentMode === 1 || color === TARGET_COLOR_MODE2 };
    setDots([newDot]); setTimeLeft(timeMs);
    clearInterval(tickRef.current); const startT = Date.now();
    tickRef.current = setInterval(() => { setTimeLeft(Math.max(0, timeMs - (Date.now() - startT))); }, 30);
    clearTimeout(dotTimerRef.current);
    dotTimerRef.current = setTimeout(() => {
      if (!activeRef.current) return; clearInterval(tickRef.current);
      if (newDot.isTarget) { playMiss(); const nm = missRef.current + 1; setMisses(nm); setRoundMisses(r => r + 1); roundMissesRef.current++; setShowFlash("miss"); setTimeout(() => setShowFlash(null), 300);
        if (nm >= MAX_MISSES) { activeRef.current = false; setDots([]); playGameOver(); endGame(scoreRef.current, roundRef.current, modeRef.current); setScreen("gameOver"); return; }
      }
      const nc = dotsClearedRef.current + 1; setDotsCleared(nc); setDots([]);
      if (nc >= DOTS_PER_ROUND) { activeRef.current = false; playRoundUp(); onRoundComplete(); setScreen("roundEnd"); }
      else setTimeout(() => spawnDot(currentRound, currentMode), 300);
    }, timeMs);
    if (currentMode === 2 && currentRound >= 2) {
      const numExtra = Math.min(currentRound - 1, 3);
      for (let i = 0; i < numExtra; i++) {
        const delay = rand(200, timeMs * 0.7);
        setTimeout(() => { if (!activeRef.current) return; const p = getPos(w, h, DOT_SIZE); setDots(prev => [...prev, { id: Date.now() + Math.random(), x: p.x, y: p.y, color: DECOY_COLORS[Math.floor(Math.random() * DECOY_COLORS.length)], isTarget: false }]); }, delay);
      }
    }
  }, [getFieldDims, getTimeForRound, endGame, onRoundComplete, spawnMode3Wave]);

  const handleDotTap = useCallback((dot) => {
    if (!activeRef.current) return;
    const isMode3 = modeRef.current === 3;
    if (dot.isTarget) {
      playTap(); setScore(s => s + 1);
      setRipples(prev => [...prev, { id: Date.now(), x: dot.x, y: dot.y, color: dot.color }]); setTimeout(() => setRipples(prev => prev.slice(1)), 500);
      setShowFlash("hit"); setTimeout(() => setShowFlash(null), 200);
      if (isMode3) {
        setDots(prev => prev.filter(d => d.id !== dot.id));
        const newTL = targetsLeftRef.current - 1; setTargetsLeft(newTL); targetsLeftRef.current = newTL;
        if (newTL <= 0) { clearTimeout(dotTimerRef.current); clearInterval(tickRef.current); const nc = dotsClearedRef.current + 1; setDotsCleared(nc); setDots([]);
          if (nc >= DOTS_PER_ROUND) { activeRef.current = false; playRoundUp(); onRoundComplete(); setScreen("roundEnd"); } else setTimeout(() => spawnMode3Wave(roundRef.current), 350);
        }
      } else {
        clearTimeout(dotTimerRef.current); clearInterval(tickRef.current); const nc = dotsClearedRef.current + 1; setDotsCleared(nc); setDots([]);
        if (nc >= DOTS_PER_ROUND) { activeRef.current = false; playRoundUp(); onRoundComplete(); setScreen("roundEnd"); } else setTimeout(() => spawnDot(roundRef.current, modeRef.current), 250);
      }
    } else {
      playWrongColor(); const nm = missRef.current + 1; setMisses(nm); setRoundMisses(r => r + 1); roundMissesRef.current++;
      setShowFlash("wrong"); setTimeout(() => setShowFlash(null), 300);
      setDots(prev => prev.filter(d => d.id !== dot.id));
      if (nm >= MAX_MISSES) { activeRef.current = false; clearTimeout(dotTimerRef.current); clearInterval(tickRef.current); setDots([]); playGameOver(); endGame(scoreRef.current, roundRef.current, modeRef.current); setScreen("gameOver"); }
    }
  }, [spawnDot, spawnMode3Wave, endGame, onRoundComplete]);

  const startRound = useCallback((r) => {
    setDotsCleared(0); dotsClearedRef.current = 0; setDots([]); setRoundMisses(0); roundMissesRef.current = 0; setCountdown(3);
    let c = 3; const iv = setInterval(() => { c--; if (c <= 0) { clearInterval(iv); setCountdown(null); activeRef.current = true; spawnDot(r, modeRef.current); } else setCountdown(c); }, 700);
  }, [spawnDot]);

  const startGame = useCallback((selectedMode) => {
    setMode(selectedMode); modeRef.current = selectedMode;
    setRound(1); setScore(0); setMisses(0); setDotsCleared(0); setRoundMisses(0); roundMissesRef.current = 0; setPerfectStreak(0); perfectStreakRef.current = 0;
    persistAll({ playerName }); setScreen("ready");
  }, [persistAll, playerName]);

  const launchRound = useCallback(() => {
    setScreen("playing"); setTimeout(() => startRound(round), 100);
  }, [startRound, round]);

  const nextRound = useCallback(() => { const nr = round + 1; setRound(nr); setScreen("ready"); }, [round]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const dismissToast = useCallback(() => { setToastQueue(prev => prev.slice(1)); }, []);

  const accent = mode === 3 ? "#E84393" : mode === 2 ? TARGET_COLOR_MODE2 : "#00E5FF";
  const accentDim = accent + "33";
  const modeLabel = mode === 1 ? "Classic" : mode === 2 ? "Color Filter" : "Dual Hunt";

  if (!loaded) return <div style={{ width: "100%", minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #00E5FF33", borderTopColor: "#00E5FF", animation: "spin 0.8s linear infinite" }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", color: t.text, overflow: "hidden", userSelect: "none", WebkitUserSelect: "none", position: "relative", transition: "background 0.4s" }}>
      <style>{`
        @keyframes rippleOut { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px ${accentDim}; } 50% { box-shadow: 0 0 40px ${accentDim}, 0 0 60px ${accentDim}; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countPulse { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes flashHit { 0% { opacity: 0.25; } 100% { opacity: 0; } }
        @keyframes flashMiss { 0% { opacity: 0.2; } 100% { opacity: 0; } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.9); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes toastOut { to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
        * { box-sizing: border-box; } input:focus { outline: none; }
      `}</style>

      {/* Toasts */}
      {toastQueue.length > 0 && <AchievementToast achievement={toastQueue[0]} t={t} onDone={dismissToast} key={toastQueue[0].id} />}

      {showPrivacy && <PrivacyModal t={t} onClose={() => setShowPrivacy(false)} />}
      {showAchievements && <AchievementsPanel t={t} unlockedIds={gameData.achievements || []} onClose={() => setShowAchievements(false)} />}

      {/* ═══════ MENU ═══════ */}
      {screen === "menu" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "60px 24px 40px", animation: "fadeSlideUp 0.5s ease", maxWidth: 420, position: "relative" }}>
          <FloatingDots isDark={isDark} />
          <div style={{ position: "absolute", top: 16, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
            <PrivacyBadge t={t} onTap={() => setShowPrivacy(true)} />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} t={t} />
          </div>

          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 42, fontWeight: 800, background: "linear-gradient(135deg, #00E5FF, #9B6DFF, #E84393)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1, marginBottom: 8, zIndex: 1 }}><span>DOT</span><span style={{ marginLeft: 14 }}>HUNTER</span></div>
          <div style={{ fontSize: 14, color: t.textMuted, letterSpacing: 6, textTransform: "uppercase", marginBottom: 32, zIndex: 1 }}>TEST YOUR FOCUS</div>

          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 30px #00E5FF66", animation: "pulseGlow 2s infinite", marginBottom: 28, zIndex: 1 }} />

          {/* Achievements button */}
          <button onClick={() => setShowAchievements(true)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
            background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 14,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 20, transition: "all 0.2s",
          }}
            onPointerEnter={e => e.currentTarget.style.borderColor = "#FFD700"}
            onPointerLeave={e => e.currentTarget.style.borderColor = t.border}
          >
            <div style={{ width: 24, height: 24 }} dangerouslySetInnerHTML={{ __html: ICONS.star("#FFD700") }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, textAlign: "left" }}>Achievements</div>
              <div style={{ fontSize: 11, color: t.textDim }}>{unlockedCount}/{ACHIEVEMENT_DEFS.length} unlocked</div>
            </div>
            {/* Mini progress arc */}
            <div style={{ width: "100%", maxWidth: 50, height: 4, background: t.barBg, borderRadius: 2, overflow: "hidden", marginLeft: 8 }}>
              <div style={{ height: "100%", width: `${(unlockedCount / ACHIEVEMENT_DEFS.length) * 100}%`, background: "linear-gradient(90deg, #FFD700, #E84393)", borderRadius: 2 }} />
            </div>
          </button>

          {/* High scores */}
          {(gameData.classicHigh > 0 || gameData.colorHigh > 0 || gameData.dualHigh > 0) && (
            <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap", justifyContent: "center", background: t.cardBg, borderRadius: 14, padding: "12px 20px", border: `1px solid ${t.border}` }}>
              {gameData.classicHigh > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>CLASSIC</div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#00E5FF" }}>{gameData.classicHigh}</div></div>}
              {gameData.colorHigh > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>COLOR</div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: TARGET_COLOR_MODE2 }}>{gameData.colorHigh}</div></div>}
              {gameData.dualHigh > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>DUAL</div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#E84393" }}>{gameData.dualHigh}</div></div>}
            </div>
          )}

          <ScoreHistory recentGames={gameData.recentGames} t={t} />

          <button onClick={() => setScreen("nameEntry")} style={{ width: "100%", padding: "16px 0", background: "transparent", border: "1.5px solid #00E5FF55", borderRadius: 14, color: "#00E5FF", fontSize: 16, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 14 }}
            onPointerEnter={e => { e.target.style.background = "#00E5FF15"; e.target.style.borderColor = "#00E5FF"; }}
            onPointerLeave={e => { e.target.style.background = "transparent"; e.target.style.borderColor = "#00E5FF55"; }}
          >PLAY</button>

          {gameData.recentGames && gameData.recentGames.length > 0 && (
            <button onClick={clearAllData} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginTop: 12, padding: "6px 12px", borderRadius: 8 }}
              onPointerEnter={e => e.target.style.color = "#FF4D6A"} onPointerLeave={e => e.target.style.color = t.textMuted}
            >Clear all data</button>
          )}
        </div>
      )}

      {/* ═══════ NAME ENTRY ═══════ */}
      {screen === "nameEntry" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420, overflowY: "auto" }}>
          <div style={{ position: "absolute", top: 16, right: 20 }}><ThemeToggle isDark={isDark} onToggle={toggleTheme} t={t} /></div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 24, color: t.text }}>Enter Your Name</div>
          <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value.slice(0, 16))} placeholder="Player" autoFocus
            style={{ width: "100%", padding: "14px 18px", background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 12, color: t.text, fontSize: 18, fontFamily: "inherit", textAlign: "center", marginBottom: 28 }}
            onFocus={e => e.target.style.borderColor = "#00E5FF"} onBlur={e => e.target.style.borderColor = t.inputBorder} />
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 14, letterSpacing: 3, textTransform: "uppercase" }}>Select Mode</div>
          <button onClick={() => startGame(1)} style={{ width: "100%", padding: "14px 0", background: isDark ? "#00E5FF08" : "#00E5FF12", border: "1.5px solid #00E5FF44", borderRadius: 14, color: "#00E5FF", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>●</span>&nbsp;&nbsp;Classic Focus<div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Single dot — pure speed</div>
          </button>
          <button onClick={() => startGame(2)} style={{ width: "100%", padding: "14px 0", background: isDark ? "#00E67608" : "#00E67612", border: "1.5px solid #00E67644", borderRadius: 14, color: TARGET_COLOR_MODE2, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>●</span><span style={{ fontSize: 14, marginLeft: 4 }}><span style={{ color: "#FF4D6A" }}>●</span><span style={{ color: "#FFB830" }}>●</span><span style={{ color: "#9B6DFF" }}>●</span></span>&nbsp;&nbsp;Color Filter<div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Tap green, ignore decoys</div>
          </button>
          <button onClick={() => { setPickedColors([]); setScreen("colorPicker"); }} style={{ width: "100%", padding: "14px 0", background: isDark ? "#E8439308" : "#E8439312", border: "1.5px solid #E8439344", borderRadius: 14, color: "#E84393", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>●●</span><span style={{ fontSize: 14, marginLeft: 4 }}><span style={{ color: "#FFB830" }}>●</span><span style={{ color: "#00E5FF" }}>●</span><span style={{ color: "#00E676" }}>●</span></span>&nbsp;&nbsp;Dual Hunt<div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Pick 2 colors — find them in the chaos</div>
          </button>
          <button onClick={() => setScreen("menu")} style={{ marginTop: 16, background: "none", border: "none", color: t.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>← Back</button>
        </div>
      )}

      {/* ═══════ COLOR PICKER ═══════ */}
      {screen === "colorPicker" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 8, color: t.text }}>Choose Your 2 Colors</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 28 }}>Tap the colors you want to hunt</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32, width: "100%", maxWidth: 280 }}>
            {ALL_COLORS.map(c => {
              const sel = pickedColors.includes(c.hex); const dis = pickedColors.length >= 2 && !sel;
              return <button key={c.id} onClick={() => { if (sel) setPickedColors(p => p.filter(x => x !== c.hex)); else if (pickedColors.length < 2) setPickedColors(p => [...p, c.hex]); }} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", borderRadius: 14,
                background: sel ? `${c.hex}20` : t.cardBg, border: sel ? `2px solid ${c.hex}` : `1.5px solid ${t.border}`,
                cursor: dis ? "default" : "pointer", opacity: dis ? 0.35 : 1, transition: "all 0.2s", fontFamily: "inherit",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.hex, boxShadow: sel ? `0 0 14px ${c.hex}66` : "none" }} />
                <div style={{ fontSize: 10, color: t.textDim, fontWeight: 500 }}>{c.name}</div>
              </button>;
            })}
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, minHeight: 48, alignItems: "center" }}>
            {pickedColors.length === 0 && <div style={{ fontSize: 13, color: t.textMuted }}>Select 2 colors above</div>}
            {pickedColors.map((hex, i) => <div key={i} style={{ width: 44, height: 44, borderRadius: "50%", background: hex, boxShadow: `0 0 16px ${hex}66`, border: `2px solid ${hex}`, animation: "fadeSlideUp 0.2s ease" }} />)}
            {pickedColors.length === 1 && <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 18 }}>+</div>}
          </div>
          <button onClick={() => startGame(3)} disabled={pickedColors.length !== 2} style={{ width: "100%", padding: "16px 0", background: pickedColors.length === 2 ? "#E84393" : t.barBg, border: "none", borderRadius: 14, color: pickedColors.length === 2 ? (isDark ? "#0a0a1a" : "#fff") : t.textMuted, fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: pickedColors.length === 2 ? "pointer" : "default", boxShadow: pickedColors.length === 2 ? "0 4px 20px #E8439344" : "none" }}>START DUAL HUNT</button>
          <button onClick={() => setScreen("nameEntry")} style={{ marginTop: 16, background: "none", border: "none", color: t.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>← Back</button>
        </div>
      )}

      {/* ═══════ READY SCREEN ═══════ */}
      {screen === "ready" && (() => {
        const inst = MODE_INSTRUCTIONS[mode];
        const timeMs = getTimeForRound(round);
        return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
          {/* Round badge */}
          <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>{inst.title}</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 56, fontWeight: 800, color: accent, lineHeight: 1, marginBottom: 6 }}>{round === 1 ? "" : ""}{round}</div>
          <div style={{ fontSize: 12, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 32 }}>Round {round}</div>

          {/* Instructions card */}
          <div style={{ width: "100%", background: t.cardBg, borderRadius: 16, border: `1px solid ${t.border}`, padding: "20px 22px", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 20, height: 20 }} dangerouslySetInnerHTML={{ __html: ICONS.target(accent) }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: 1 }}>HOW TO PLAY</div>
            </div>
            <div style={{ fontSize: 15, color: t.text, lineHeight: 1.6, marginBottom: 10 }}>{inst.rule}</div>
            <div style={{ fontSize: 13, color: t.textDim, lineHeight: 1.5 }}>{inst.tip}</div>
          </div>

          {/* Round info */}
          <div style={{ display: "flex", gap: 20, marginBottom: 32 }}>
            <div style={{ textAlign: "center", background: t.cardBg, borderRadius: 12, padding: "10px 18px", border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>TIME</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: timeMs <= 1000 ? "#FF4D6A" : accent }}>{(timeMs / 1000).toFixed(1)}s</div>
            </div>
            <div style={{ textAlign: "center", background: t.cardBg, borderRadius: 12, padding: "10px 18px", border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>DOTS</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: t.text }}>{DOTS_PER_ROUND}</div>
            </div>
            {mode === 3 && <div style={{ textAlign: "center", background: t.cardBg, borderRadius: 12, padding: "10px 18px", border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>PER WAVE</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: t.text }}>{Math.min(4 + round, 12)}</div>
            </div>}
          </div>

          {/* Color indicators for mode 2 & 3 */}
          {mode === 2 && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: t.textDim }}>
            Target: <div style={{ width: 18, height: 18, borderRadius: "50%", background: TARGET_COLOR_MODE2, boxShadow: `0 0 8px ${TARGET_COLOR_MODE2}66` }} />
          </div>}
          {mode === 3 && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: t.textDim }}>
            Targets: {pickedColors.map((hex, i) => <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: hex, boxShadow: `0 0 8px ${hex}66` }} />)}
          </div>}

          {/* Score so far (after round 1) */}
          {round > 1 && <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: t.textDim }}>Score: <span style={{ fontWeight: 700, color: t.text }}>{score}</span></div>
            <div style={{ fontSize: 13, color: t.textDim }}>Misses: <span style={{ fontWeight: 700, color: misses > 0 ? "#FF4D6A" : t.text }}>{misses}/{MAX_MISSES}</span></div>
          </div>}

          <button onClick={launchRound} style={{
            width: "100%", padding: "18px 0", background: accent, border: "none",
            borderRadius: 14, color: t.btnText, fontSize: 17, fontWeight: 800, fontFamily: "'Outfit', sans-serif",
            cursor: "pointer", boxShadow: `0 4px 24px ${accent}44`, letterSpacing: 1,
            transition: "transform 0.15s", 
          }}
            onPointerDown={e => e.target.style.transform = "scale(0.97)"}
            onPointerUp={e => e.target.style.transform = "scale(1)"}
          >I'M READY</button>
        </div>
        );
      })()}

      {/* ═══════ PLAYING ═══════ */}
      {screen === "playing" && (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 420, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 8px" }}>
            <div><div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>{playerName || "Player"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}><span style={{ fontSize: 13, color: t.textDim }}>{modeLabel}</span>{mode === 3 && pickedColors.map((hex, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: hex }} />)}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Round</div><div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{round}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Score</div><div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: t.text, lineHeight: 1 }}>{score}</div></div>
          </div>
          <div style={{ padding: "0 20px 6px", display: "flex", alignItems: "center", gap: 12 }}><div style={{ flex: 1 }}><TimerBar timeLeft={timeLeft} maxTime={getTimeForRound(round)} color={accent} t={t} /></div><MissIndicator misses={misses} max={MAX_MISSES} t={t} /></div>
          <div style={{ padding: "0 20px 8px" }}><div style={{ display: "flex", gap: 3 }}>{Array.from({ length: DOTS_PER_ROUND }).map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < dotsCleared ? accent : t.barBg, transition: "background 0.2s" }} />)}</div></div>
          <div ref={fieldRef} style={{ flex: 1, margin: "0 12px 12px", background: t.surfaceGrad, borderRadius: 20, border: `1px solid ${t.border}`, position: "relative", overflow: "hidden", touchAction: "manipulation", minHeight: "70vh", transition: "background 0.4s, border-color 0.4s" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, ${t.dotGrid} 1px, transparent 1px)`, backgroundSize: "30px 30px", pointerEvents: "none" }} />
            {showFlash && <div style={{ position: "absolute", inset: 0, background: showFlash === "hit" ? accent : showFlash === "wrong" ? "#9B6DFF" : "#FF4D6A", animation: showFlash === "hit" ? "flashHit 0.2s ease forwards" : "flashMiss 0.3s ease forwards", pointerEvents: "none", zIndex: 30, borderRadius: 20 }} />}
            {countdown !== null && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}><div key={countdown} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 72, fontWeight: 800, color: accent, animation: "countPulse 0.6s ease", textShadow: `0 0 40px ${accentDim}` }}>{countdown}</div></div>}
            {dots.map(dot => <Dot key={dot.id} dot={dot} onTap={handleDotTap} small={mode === 3} />)}
            {ripples.map(r => <Ripple key={r.id} x={r.x} y={r.y} color={r.color} />)}
            {mode === 2 && countdown === null && <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 11, color: t.textMuted, pointerEvents: "none" }}>Tap <span style={{ color: TARGET_COLOR_MODE2 }}>●</span> green only</div>}
            {mode === 3 && countdown === null && <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 11, color: t.textMuted, pointerEvents: "none", display: "flex", justifyContent: "center", gap: 4, alignItems: "center" }}>Tap {pickedColors.map((hex, i) => <span key={i} style={{ color: hex, fontSize: 14 }}>●</span>)} only</div>}
          </div>
        </div>
      )}

      {/* ═══════ ROUND END ═══════ */}
      {screen === "roundEnd" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: t.textMuted, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Round Complete</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 64, fontWeight: 800, color: accent, lineHeight: 1, marginBottom: 24 }}>{round}</div>
          <div style={{ display: "flex", gap: 32, marginBottom: 40 }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>SCORE</div><div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: t.text }}>{score}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>MISSES</div><div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: misses > 0 ? "#FF4D6A" : t.text }}>{misses}</div></div>
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 24 }}>Next: <span style={{ color: accent }}>{getTimeForRound(round + 1)}ms</span> per dot{mode === 3 && <span> · {Math.min(5 + round, 12)} dots</span>}</div>
          <button onClick={nextRound} style={{ width: "100%", padding: "16px 0", background: accent, border: "none", borderRadius: 14, color: t.btnText, fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 20px ${accent}44` }}>NEXT ROUND →</button>
        </div>
      )}

      {/* ═══════ GAME OVER ═══════ */}
      {screen === "gameOver" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: "#FF4D6A", letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>Game Over</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 32, color: t.textDim }}>{playerName || "Player"}</div>
          <div style={{ display: "flex", gap: 32, marginBottom: 12 }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>FINAL SCORE</div><div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 48, fontWeight: 800, color: accent }}>{score}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>ROUND</div><div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 48, fontWeight: 800, color: t.text }}>{round}</div></div>
          </div>
          {score > 0 && score >= currentHigh && <div style={{ fontSize: 13, color: "#FFD700", marginBottom: 24, letterSpacing: 2, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16 }} dangerouslySetInnerHTML={{ __html: ICONS.star("#FFD700") }} /> New Best <div style={{ width: 16, height: 16 }} dangerouslySetInnerHTML={{ __html: ICONS.star("#FFD700") }} />
          </div>}
          <button onClick={() => startGame(mode)} style={{ width: "100%", padding: "16px 0", background: accent, border: "none", borderRadius: 14, color: t.btnText, fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", marginBottom: 12, boxShadow: `0 4px 20px ${accent}44` }}>PLAY AGAIN</button>
          <button onClick={() => { setScreen("menu"); setMode(1); }} style={{ width: "100%", padding: "14px 0", background: "transparent", border: `1.5px solid ${t.border}`, borderRadius: 14, color: t.textDim, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>MENU</button>
        </div>
      )}
    </div>
  );
}
