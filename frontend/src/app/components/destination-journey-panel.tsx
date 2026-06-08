"use client";

import { useMemo, useState } from "react";
import { type Destination } from "../data/destinations";
import { rewardQR, type TransportType } from "../lib/scoreEngine";
import QRScanner from "./QRScanner";

type DestinationJourneyPanelProps = {
  destination: Destination | null;
  selectedTransport: TransportType | null;
  completedChallengeIds: string[];
  onClose: () => void;
  onChooseTransport: (transport: TransportType) => void;
  onChallengeCompleted: (challengeId: string, reward: number) => void;
  onStoryUnlocked: (destination: Destination) => void;
};

export default function DestinationJourneyPanel({
  destination,
  selectedTransport,
  completedChallengeIds,
  onClose,
  onChooseTransport,
  onChallengeCompleted,
  onStoryUnlocked
}: DestinationJourneyPanelProps) {
  const [scanMessage, setScanMessage] = useState("");

  const challenge = useMemo(() => {
    return destination?.qrChallenges[0] ?? null;
  }, [destination]);

  if (!destination) {
    return null;
  }

  const activeDestination = destination;

  const challengeDone = challenge ? completedChallengeIds.includes(challenge.id) : false;

  function handleScan(code: string) {
    if (!challenge) {
      return;
    }

    if (challengeDone) {
      setScanMessage("Mission completed.");
      return;
    }

    if (challenge.qrCode === code) {
      const reward = rewardQR(challenge);
      onChallengeCompleted(challenge.id, reward);
      onStoryUnlocked(activeDestination);
      setScanMessage(`+${reward} Green Score. New story unlocked.`);
      return;
    }

    setScanMessage("Incorrect QR code. Try again with the correct demo code.");
  }

  return (
    <aside className="destinationJourneyPanel" data-testid="destination-journey-panel">
      <header>
        <h3>{destination.name}</h3>
        <button type="button" onClick={onClose}>Close</button>
      </header>

      <section>
        <h4>Overview</h4>
        <p>{destination.shortDescription}</p>
      </section>

      

      <section>
        <h4>Choose your route</h4>
        <div className="transportChoiceRow">
          <button type="button" className={selectedTransport === "bike" ? "active" : ""} onClick={() => onChooseTransport("bike")}>🚲 Bike</button>
          <button type="button" className={selectedTransport === "ev" ? "active" : ""} onClick={() => onChooseTransport("ev")}>⚡ EV</button>
          <button type="button" className={selectedTransport === "walk" ? "active" : ""} onClick={() => onChooseTransport("walk")}>🚶 Walk</button>
          <button type="button" className={selectedTransport === "motorbike" ? "active" : ""} onClick={() => onChooseTransport("motorbike")}>🛵 Motorbike</button>
        </div>
      </section>

      <section>
        <h4>Mission</h4>
        {challenge ? (
          <>
            <p>{challenge.question}</p>
            <QRScanner onScan={handleScan} disabled={!selectedTransport} />
            {scanMessage ? <p className="scanMessage">{scanMessage}</p> : null}
          </>
        ) : (
          <p>No mission available yet.</p>
        )}
      </section>

      <section>
        <h4>Deep Story</h4>
        <p>{challengeDone ? activeDestination.fullStory : "Complete the QR mission to unlock the full story."}</p>
      </section>

      <footer>
        <small>Demo QR: QR_CUCHI_001</small>
      </footer>
    </aside>
  );
}
