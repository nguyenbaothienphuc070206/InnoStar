"use client";

import { useEffect, useState } from "react";
import { PlaceData, generateGreenTips } from "../engine/place-narrative";
import { useTypewriter } from "../hooks/use-typewriter";

type PlaceStoryCardProps = {
  place: PlaceData | null;
  script: string[];
  persona: "coba" | "driver" | "youth";
  onNextStep: () => void;
  isFinished: boolean;
};

type GuideMotionFrame = "idle" | "up" | "down" | "blink";

export default function PlaceStoryCard({ place, script, persona, onNextStep, isFinished }: PlaceStoryCardProps) {
  const [guideMotion, setGuideMotion] = useState<GuideMotionFrame>("idle");
  const [currentGreenTip, setCurrentGreenTip] = useState(0);

  const { displayText, currentLineIndex, goToNext } = useTypewriter(script, (idx) => {
    if (idx % 2 === 0) {
      setGuideMotion("blink");
      setTimeout(() => setGuideMotion("idle"), 300);
    } else {
      setGuideMotion("up");
      setTimeout(() => setGuideMotion("down"), 400);
      setTimeout(() => setGuideMotion("idle"), 800);
    }
  });

  if (!place) {
    return null;
  }

  const greenTips = generateGreenTips(place);
  const guideImage = `/guides/${persona}-${guideMotion}.svg`;

  return (
    <div className="placeStoryCard" data-testid="place-story-card">
      <div className="storyCardHeader">
        <img src={guideImage} alt={`Guide ${persona}`} className="storyGuideAvatar" />
        <h2 className="storyPlaceName">{place.name}</h2>
      </div>

      <div className="storyNarration">
        <p className="storyText">{displayText}</p>
        {displayText && <span className="typingCursor" />}
      </div>

      <div className="greenTipsCarousel">
        <strong>🌱 Green Tips:</strong>
        <div className="greenTipItem">{greenTips[currentGreenTip]}</div>
        <div className="greenTipNav">
          {greenTips.map((_, idx) => (
            <button
              key={idx}
              className={`tipDot ${idx === currentGreenTip ? "active" : ""}`}
              onClick={() => setCurrentGreenTip(idx)}
              disabled={idx >= greenTips.length}
            />
          ))}
        </div>
      </div>

      <div className="storyControls">
        <button className="storyNextBtn" onClick={goToNext} disabled={isFinished}>
          {isFinished ? "Đã kết thúc" : displayText && displayText.length === script[currentLineIndex]?.length ? "Tiếp ▶" : "Skip"}
        </button>
      </div>
    </div>
  );
}
