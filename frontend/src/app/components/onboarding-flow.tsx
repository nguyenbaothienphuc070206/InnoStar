"use client";

import { useState } from "react";
import type { TransportType } from "../lib/scoreEngine";

type PersonaOption = "coba" | "driver" | "youth";

type OnboardingFlowProps = {
  onComplete: (payload: { selectedPersona: PersonaOption; selectedTransport: TransportType; journeyGoal: string }) => void;
};

const goals = ["History trail", "Local food", "Green commute", "Hidden gems"];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null);
  const [journeyGoal, setJourneyGoal] = useState(goals[0]);
  const [goalOpen, setGoalOpen] = useState(false);

  return (
    <div className="onboardingOverlay" data-testid="onboarding-flow">
      <div className="onboardingCard">
        <h1>Welcome to GreenPark AI</h1>
        <p>Choose your explorer style</p>

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

        <label className="onboardingGoalLabel">🌱 Select your eco mission</label>
        <div className="missionDropdown">
          <button
            type="button"
            className="onboardingGoalButton"
            onClick={() => setGoalOpen((value) => !value)}
            aria-expanded={goalOpen}
            aria-haspopup="listbox"
          >
            <span>{journeyGoal}</span>
            <span className="missionChevron">▾</span>
          </button>
          {goalOpen ? (
            <div className="onboardingGoalMenu" role="listbox">
              {goals.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  className={`onboardingGoalOption ${journeyGoal === goal ? "active" : ""}`}
                  onClick={() => {
                    setJourneyGoal(goal);
                    setGoalOpen(false);
                  }}
                >
                  {goal}
                </button>
              ))}
            </div>
          ) : null}
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
          Enter Map
        </button>
      </div>
    </div>
  );
}
