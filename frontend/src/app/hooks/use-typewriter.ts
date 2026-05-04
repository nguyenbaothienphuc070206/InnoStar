import { useEffect, useState } from "react";

export function useTypewriter(lines: string[], onLineChange?: (lineIndex: number) => void) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setIsTyping(false);
      return;
    }

    const line = lines[currentLineIndex];
    let charIndex = 0;
    let timer: number | null = null;

    const type = () => {
      if (charIndex < line.length) {
        setDisplayText(line.substring(0, charIndex + 1));
        charIndex += 1;
        const delay = line[charIndex - 1] === "." || line[charIndex - 1] === "?" || line[charIndex - 1] === "!" ? 60 : 30;
        timer = window.setTimeout(type, delay);
      } else {
        setIsTyping(false);
        setCurrentLineIndex((prev) => prev + 1);
        onLineChange?.(currentLineIndex + 1);
      }
    };

    const startDelay = window.setTimeout(type, currentLineIndex === 0 ? 400 : 800);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      window.clearTimeout(startDelay);
    };
  }, [currentLineIndex, lines, onLineChange]);

  const goToNext = () => {
    if (isTyping) {
      setDisplayText(lines[currentLineIndex]);
      setIsTyping(false);
    } else if (currentLineIndex < lines.length) {
      setCurrentLineIndex((prev) => prev + 1);
      setDisplayText("");
    }
  };

  return {
    displayText,
    currentLineIndex,
    isFinished: currentLineIndex >= lines.length,
    goToNext
  };
}
