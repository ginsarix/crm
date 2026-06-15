'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { Button } from '~/components/ui/button';

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
  children: ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.82, y: 18 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 480,
      damping: 22,
      staggerChildren: 0.055,
      delayChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 10,
    transition: {
      duration: 0.14,
      ease: [0.4, 0, 1, 1] as const,
      staggerChildren: 0.03,
      staggerDirection: -1 as const,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.75, y: 5 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: -3,
    transition: { duration: 0.09, ease: [0.4, 0, 1, 1] as const },
  },
};

export function BulkActionsBar({ count, onClear, children }: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
          <motion.div
            animate="visible"
            className="flex flex-wrap items-center gap-3 rounded-xl border bg-background px-4 py-2.5 shadow-xl"
            exit="exit"
            initial="hidden"
            variants={containerVariants}
          >
            <motion.span
              className="whitespace-nowrap font-medium text-sm"
              variants={itemVariants}
            >
              {count} kayıt seçildi
            </motion.span>
            {React.Children.map(children, (child) =>
              child != null ? (
                <motion.div variants={itemVariants}>{child}</motion.div>
              ) : null,
            )}
            <motion.div variants={itemVariants}>
              <Button
                className="h-8 w-8"
                onClick={onClear}
                size="icon"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
