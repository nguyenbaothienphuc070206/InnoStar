"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addGreenScore, rankFromScore, rewardTransport, type TransportType } from "../lib/scoreEngine";

type JourneyState = {
  greenScore: number;
  visitedDestinations: string[];
  completedChallenges: string[];
  transportUsed: TransportType[];
  unlockedDestinations: string[];
  unlockedSecrets: string[];
  selectedPersona: "coba" | "driver" | "youth" | null;
  selectedTransport: TransportType | null;
  journeyGoal: string;
};

type JourneyContextValue = JourneyState & {
  rank: string;
  visitDestination: (id: string) => void;
  completeChallenge: (id: string, reward?: number) => void;
  useTransport: (type: TransportType, reward?: number) => void;
  unlockDestination: (id: string) => void;
  unlockSecretRoute: (id: string) => void;
  setPersona: (persona: "coba" | "driver" | "youth") => void;
  setInitialTransport: (transport: TransportType) => void;
  setJourneyGoal: (goal: string) => void;
  addPoints: (points: number) => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

const STORAGE_KEY = "saigongreen.journey.v1";

const defaultState: JourneyState = {
  greenScore: 0,
  visitedDestinations: [],
  completedChallenges: [],
  transportUsed: [],
  unlockedDestinations: [],
  unlockedSecrets: [],
  selectedPersona: null,
  selectedTransport: null,
  journeyGoal: ""
};

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<JourneyState>(defaultState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as JourneyState;
      setState({ ...defaultState, ...parsed });
    } catch {
      setState(defaultState);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<JourneyContextValue>(() => {
    return {
      ...state,
      rank: rankFromScore(state.greenScore),
      visitDestination: (id) => {
        setState((prev) =>
          prev.visitedDestinations.includes(id)
            ? prev
            : { ...prev, visitedDestinations: [...prev.visitedDestinations, id] }
        );
      },
      completeChallenge: (id, reward = 0) => {
        setState((prev) => {
          if (prev.completedChallenges.includes(id)) {
            return prev;
          }
          return {
            ...prev,
            completedChallenges: [...prev.completedChallenges, id],
            greenScore: addGreenScore(prev.greenScore, reward)
          };
        });
      },
      useTransport: (type, reward) => {
        setState((prev) => ({
          ...prev,
          selectedTransport: type,
          transportUsed: [...prev.transportUsed, type],
          greenScore: addGreenScore(prev.greenScore, reward ?? rewardTransport(type))
        }));
      },
      unlockDestination: (id) => {
        setState((prev) =>
          prev.unlockedDestinations.includes(id)
            ? prev
            : { ...prev, unlockedDestinations: [...prev.unlockedDestinations, id] }
        );
      },
      unlockSecretRoute: (id) => {
        setState((prev) =>
          prev.unlockedSecrets.includes(id)
            ? prev
            : { ...prev, unlockedSecrets: [...prev.unlockedSecrets, id] }
        );
      },
      setPersona: (persona) => {
        setState((prev) => ({ ...prev, selectedPersona: persona }));
      },
      setInitialTransport: (transport) => {
        setState((prev) => ({ ...prev, selectedTransport: transport }));
      },
      setJourneyGoal: (goal) => {
        setState((prev) => ({ ...prev, journeyGoal: goal }));
      },
      addPoints: (points) => {
        setState((prev) => ({ ...prev, greenScore: addGreenScore(prev.greenScore, points) }));
      }
    };
  }, [state]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error("useJourney must be used inside JourneyProvider");
  }
  return context;
}
