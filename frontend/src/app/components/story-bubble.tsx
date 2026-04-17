"use client";

import { AnimatePresence, motion } from "framer-motion";

type StoryBubbleProps = {
  story: { character: "coba" | "driver" | "youth"; text: string } | null;
  icon: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onStopVoice: () => void;
};

export default function StoryBubble({ story, icon, voiceEnabled, onToggleVoice, onStopVoice }: StoryBubbleProps) {
  return (
    <AnimatePresence>
      {story ? (
        <motion.div
          key={`${story.character}-${story.text}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="storyBubble"
          data-testid="story-bubble"
          role="status"
          aria-live="polite"
        >
          <div className="storyAvatar" aria-hidden>
            <span className="storyIcon">{icon}</span>
          </div>

          <div className="storyBody">
            <p>{story.text}</p>
            <div className="storyActions">
              <button type="button" data-testid="story-voice-toggle" onClick={onToggleVoice}>
                {voiceEnabled ? "🔊" : "🔇"}
              </button>
              <button type="button" data-testid="story-voice-stop" onClick={onStopVoice}>
                ⏹
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
