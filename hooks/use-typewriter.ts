import { useState, useEffect, useRef } from "react";

interface TypewriterOptions {
  text: string;
  speed?: number; // Characters per second
  enabled?: boolean;
}

export function useTypewriter({ text, speed = 50, enabled = true }: TypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // Reset if text changes
    if (indexRef.current === 0 || text.length < displayedText.length) {
      setDisplayedText("");
      setIsComplete(false);
      indexRef.current = 0;
    }

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // If we've shown all the text, mark as complete
    if (indexRef.current >= text.length) {
      setIsComplete(true);
      return;
    }

    // Type out the next character
    const delay = 1000 / speed;
    timerRef.current = setTimeout(() => {
      const nextIndex = indexRef.current + 1;
      setDisplayedText(text.slice(0, nextIndex));
      indexRef.current = nextIndex;

      if (nextIndex >= text.length) {
        setIsComplete(true);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, speed, enabled, displayedText.length]);

  const skip = () => {
    setDisplayedText(text);
    setIsComplete(true);
    indexRef.current = text.length;
  };

  return { displayedText, isComplete, skip };
}
