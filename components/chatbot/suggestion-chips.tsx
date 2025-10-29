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
    <div className="flex flex-wrap gap-3 justify-center">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion.action}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSuggestionClick(suggestion)}
          className="flex items-center gap-2.5 rounded-full border-2 border-primary/30 bg-gradient-to-r from-surface to-surface/80 px-5 py-2.5 text-sm font-semibold text-primary shadow-md backdrop-blur-sm transition-all duration-500 ease-out hover:border-primary hover:bg-gradient-to-r hover:from-primary hover:to-primary-hover hover:text-white hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
        >
          <span className="text-lg">{suggestion.icon}</span>
          <span>{suggestion.text}</span>
        </motion.button>
      ))}
    </div>
  );
}

