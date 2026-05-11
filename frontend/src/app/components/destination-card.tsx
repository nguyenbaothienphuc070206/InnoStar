"use client";

export interface DestinationCardData {
  title: string;
  description: string;
  vibe?: string;
  bestGuide?: string;
}

interface DestinationCardProps {
  data?: DestinationCardData | null;
  onAction?: (action: "find-parking" | "view-route" | "start-story") => void;
  onClose?: () => void;
}

export default function DestinationCard({ 
  data,
  onAction,
  onClose
}: DestinationCardProps) {
  if (!data) return null;

  return (
    <div className="destination-card">
      <button className="destination-close" onClick={onClose}>✕</button>
      
      <h3>{data.title}</h3>
      <p>{data.description}</p>
      
      {data.vibe && <p className="destination-vibe">{data.vibe}</p>}

      <div className="destination-actions">
        <button onClick={() => onAction?.("find-parking")}>Find Parking</button>
        <button onClick={() => onAction?.("view-route")}>View Route</button>
        <button onClick={() => onAction?.("start-story")}>Start Story</button>
      </div>
    </div>
  );
}
