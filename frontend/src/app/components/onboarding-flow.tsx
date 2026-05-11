"use client";

import { useState } from "react";
import type { TransportType } from "../lib/scoreEngine";

type PersonaOption = "coba" | "driver" | "youth";

type OnboardingFlowProps = {
  onComplete: (payload: { selectedPersona: PersonaOption; selectedTransport: TransportType; journeyGoal: string }) => void;
};

const onboardingSteps = [
  "Chọn persona",
  "Chọn điểm đến",
  "Follow green route",
  "Scan checkpoint",
  "Unlock story",
  "Earn Green Score"
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null);
  const journeyGoal = "Explore SaigonGreen";

  return (
    <div className="onboardingOverlay">
      <div className="onboardingCard onboardingModal" data-testid="onboarding-flow">
        <h1>Welcome to SaigonGreen</h1>
        <p>Use this once. Then the map takes over.</p>

        <ol className="onboardingStepList">
          {onboardingSteps.map((step, index) => (
            <li key={step}>
              <strong>{index + 1}.</strong>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="onboardingPersonaGrid">
          <button type="button" className={selectedPersona === "coba" ? "active" : ""} onClick={() => setSelectedPersona("coba")}>
            <strong>🌸 Cô Ba</strong>
            <span>Lịch sử / Nghệ thuật</span>
          </button>
          <button type="button" className={selectedPersona === "driver" ? "active" : ""} onClick={() => setSelectedPersona("driver")}>
            <strong>🛵 Chú Tài</strong>
            <span>Tiện lợi / Đời sống địa phương</span>
          </button>
          <button type="button" className={selectedPersona === "youth" ? "active" : ""} onClick={() => setSelectedPersona("youth")}>
            <strong>🎒 Út Local</strong>
            <span>Hidden gems</span>
          </button>
        </div>

        <p>Choose your transport</p>
        <div className="onboardingTransportGrid">
          <button type="button" className={selectedTransport === "bike" ? "active" : ""} onClick={() => setSelectedTransport("bike")}>🚲 Bike</button>
          <button type="button" className={selectedTransport === "ev" ? "active" : ""} onClick={() => setSelectedTransport("ev")}>⚡ EV</button>
          <button type="button" className={selectedTransport === "walk" ? "active" : ""} onClick={() => setSelectedTransport("walk")}>🚶 Walk</button>
        </div>

        <button
          type="button"
          className="onboardingStartBtn"
          onClick={() => {
            if (!selectedPersona || !selectedTransport) {
              return;
            }
            onComplete({ selectedPersona, selectedTransport, journeyGoal });
          }}
          disabled={!selectedPersona || !selectedTransport}
        >
          Start Exploring
        </button>
      </div>
    </div>
  );
}
