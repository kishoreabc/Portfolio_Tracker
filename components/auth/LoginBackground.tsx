'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CandlestickChart, Activity, Wallet, Banknote, Briefcase, TrendingUp, TrendingDown, DollarSign, Bitcoin } from 'lucide-react';

const GridBackground = () => (
  <div className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none z-0 mix-blend-screen"
       style={{
         backgroundImage: `
           linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px),
           linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)
         `,
         backgroundSize: '40px 40px'
       }}
  >
    <motion.div 
      className="w-full h-full bg-gradient-to-tr from-transparent via-blue-500 to-transparent opacity-30"
      animate={{ x: ['-100%', '100%'] }}
      transition={{ duration: 15, ease: "linear", repeat: Infinity }}
    />
  </div>
);

const UpwardParticles = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 hidden md:block overflow-hidden pointer-events-none z-0">
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-emerald-500/40 shadow-[0_0_8px_2px_rgba(16,185,129,0.3)]"
          initial={{ 
            x: `${Math.random() * 100}vw`, 
            y: "110vh", 
            opacity: 0 
          }}
          animate={{ 
            y: "-10vh", 
            opacity: [0, 1, 0] 
          }}
          transition={{ 
            duration: Math.random() * 15 + 15, 
            repeat: Infinity, 
            ease: "linear", 
            delay: Math.random() * 10 
          }}
        />
      ))}
    </div>
  );
};

const NetworkNodes = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block opacity-25" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
    <motion.path 
      d="M100 800 L300 500 L600 700 L900 200" 
      fill="none" 
      stroke="url(#grad)" 
      strokeWidth="2"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [0, 0.8, 0] }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path 
      d="M200 900 L400 400 L700 800 L1000 100" 
      fill="none" 
      stroke="url(#grad2)" 
      strokeWidth="1.5"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [0, 0.6, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    />
    <motion.path 
      d="M50 300 L250 600 L550 400 L850 600" 
      fill="none" 
      stroke="url(#grad)" 
      strokeWidth="1"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
    />
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
    </defs>
  </svg>
);

const FloatingTickers = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tickers = [
    { symbol: "RELIANCE", value: "+2.4%", color: "text-emerald-400", top: "15%", left: "10%", delay: 0 },
    { symbol: "TCS", value: "-1.2%", color: "text-rose-400", top: "45%", left: "80%", delay: 2 },
    { symbol: "HDFCBANK", value: "+1.1%", color: "text-emerald-400", top: "75%", left: "15%", delay: 4 },
    { symbol: "INFY", value: "+3.8%", color: "text-blue-400", top: "25%", left: "70%", delay: 1 },
    { symbol: "ZOMATO", value: "+4.2%", color: "text-emerald-400", top: "60%", left: "5%", delay: 3 },
  ];

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden hidden md:block pointer-events-none">
      {tickers.map((t, i) => (
        <motion.div
          key={i}
          className={`absolute flex flex-col items-center gap-1 font-mono text-sm font-bold opacity-0 shadow-lg ${t.color}`}
          style={{ top: t.top, left: t.left }}
          animate={{
            y: [-15, 15, -15],
            opacity: [0, 0.6, 0.6, 0],
          }}
          transition={{
            y: { duration: 10 + i, repeat: Infinity, ease: "easeInOut", delay: t.delay },
            opacity: { duration: 12 + i, repeat: Infinity, ease: "linear", delay: t.delay },
          }}
        >
          <div className="bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <span className="text-white/90">{t.symbol}</span>
            <span>{t.value}</span>
            {t.value.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const FinanceIcons = () => {
  const icons = [
    { Icon: CandlestickChart, size: 64, top: "20%", left: "85%", delay: 1, color: "text-emerald-500/10" },
    { Icon: Wallet, size: 48, top: "80%", left: "8%", delay: 3, color: "text-blue-500/10" },
    { Icon: Banknote, size: 56, top: "10%", left: "5%", delay: 5, color: "text-emerald-500/10" },
    { Icon: Activity, size: 80, top: "60%", left: "90%", delay: 2, color: "text-purple-500/10" },
    { Icon: Briefcase, size: 42, top: "85%", left: "80%", delay: 6, color: "text-amber-500/10" },
    { Icon: DollarSign, size: 96, top: "40%", left: "2%", delay: 4, color: "text-emerald-500/5" },
    { Icon: Bitcoin, size: 70, top: "5%", left: "45%", delay: 7, color: "text-amber-500/10" },
  ];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden hidden lg:block pointer-events-none">
      {icons.map((item, i) => {
        const { Icon, size, top, left, delay, color } = item;
        return (
          <motion.div
            key={i}
            className={`absolute ${color}`}
            style={{ top, left }}
            animate={{
              y: [-25, 25, -25],
              x: [-15, 15, -15],
              rotate: [-5, 5, -5],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 15 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
          >
            <Icon size={size} strokeWidth={1.5} />
          </motion.div>
        );
      })}
    </div>
  );
};

export default function LoginBackground() {
  return (
    <div className="absolute inset-0 bg-[#020617] overflow-hidden pointer-events-none z-0">
      {/* High-end Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-900/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-900/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[20%] w-[35%] h-[35%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      
      <GridBackground />
      <NetworkNodes />
      <UpwardParticles />
      <FinanceIcons />
      <FloatingTickers />
    </div>
  );
}
