"use client";

import { motion } from "framer-motion";

interface SuggestionChip {
  icon: string;
  text: string;
  action: string;
}

interface SuggestionChipsProps {
  suggestions: SuggestionChip[];
  onSuggestionClick: (suggestion: SuggestionChip) => void;
}

export function SuggestionChips({
  suggestions,
  onSuggestionClick,
}: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center" style={{ gap: 'clamp(0.5rem, 1.5vw, 0.75rem)' }}>
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion.action}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSuggestionClick(suggestion)}
          className="flex items-center rounded-full border-2 border-primary/30 bg-gradient-to-r from-surface to-surface/80 font-semibold text-primary shadow-md backdrop-blur-sm transition-all duration-200 hover:border-primary hover:bg-gradient-to-r hover:from-primary hover:to-primary-hover hover:text-white hover:shadow-xl hover:shadow-primary/20"
          style={{ 
            gap: 'clamp(0.25rem, 1vw, 0.625rem)',
            padding: 'clamp(0.375rem, 1.5vw, 0.625rem)',
            paddingLeft: 'clamp(0.75rem, 2.5vw, 1.25rem)',
            paddingRight: 'clamp(0.75rem, 2.5vw, 1.25rem)',
            fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)'
          }}
        >
          <span style={{ fontSize: 'clamp(0.875rem, 2vw, 1.125rem)' }}>{suggestion.icon}</span>
          <span>{suggestion.text}</span>
        </motion.button>
      ))}
    </div>
  );
}

