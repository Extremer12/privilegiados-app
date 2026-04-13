import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center p-12 text-center h-full w-full max-w-md mx-auto"
    >
      <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-6">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </motion.div>
  );
};
