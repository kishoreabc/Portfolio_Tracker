'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/lib/privacy-context';
import { cn } from '@/lib/utils';
import React from 'react';

interface PrivacyToggleProps {
  variant?: 'topbar' | 'compact' | 'card';
  className?: string;
  id?: string;
}

export function PrivacyToggle({
  variant = 'topbar',
  className,
  id = 'privacy-toggle-btn',
}: PrivacyToggleProps) {
  const { isHidden, togglePrivacy } = usePrivacy();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    togglePrivacy();
  };

  if (variant === 'card') {
    return (
      <motion.button
        id={id}
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={isHidden ? 'Show investment details' : 'Hide investment details'}
        title={isHidden ? 'Show investment details' : 'Hide investment details'}
        className={cn(
          'p-1.5 rounded-lg transition-colors border',
          isHidden
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
            : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10 hover:border-white/10',
          className
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isHidden ? (
            <motion.div
              key="eye-off"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            </motion.div>
          ) : (
            <motion.div
              key="eye"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Eye className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.button
        id={id}
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isHidden ? 'Show investment details' : 'Hide investment details'}
        title={isHidden ? 'Show investment details' : 'Hide investment details'}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-lg border transition-colors',
          isHidden
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white',
          className
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isHidden ? (
            <motion.div
              key="eye-off"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EyeOff className="w-4 h-4 text-amber-400" />
            </motion.div>
          ) : (
            <motion.div
              key="eye"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Eye className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // Default 'topbar' variant with optional responsive label
  return (
    <motion.button
      id={id}
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isHidden ? 'Show investment details' : 'Hide investment details'}
      title={isHidden ? 'Show investment details' : 'Hide investment details (Groww mode)'}
      className={cn(
        'flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors select-none',
        isHidden
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm shadow-amber-500/10'
          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isHidden ? (
          <motion.div
            key="eye-off"
            initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotate: 15 }}
            transition={{ duration: 0.15 }}
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          </motion.div>
        ) : (
          <motion.div
            key="eye"
            initial={{ scale: 0.8, opacity: 0, rotate: 15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotate: -15 }}
            transition={{ duration: 0.15 }}
          >
            <Eye className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="hidden sm:inline">
        {isHidden ? 'Hidden' : 'Hide'}
      </span>
    </motion.button>
  );
}
