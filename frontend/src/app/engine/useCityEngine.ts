import { useEffect, useRef } from "react";
import { CityExperience, CityState, EngineStep, deriveExperience, nextStep } from "./cityEngine";

type UseCityEngineParams = {
  state: CityState;
  enabled?: boolean;
  tickMs?: number;
  onExperience: (experience: CityExperience) => void;
  onStep: (step: EngineStep, state: CityState, experience: CityExperience) => void;
};

export function useCityEngine({
  state,
  enabled = true,
  tickMs = 1000,
  onExperience,
  onStep
}: UseCityEngineParams) {
  const stateRef = useRef(state);
  const onExperienceRef = useRef(onExperience);
  const onStepRef = useRef(onStep);

  stateRef.current = state;
  onExperienceRef.current = onExperience;
  onStepRef.current = onStep;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const run = () => {
      const current = stateRef.current;
      const experience = deriveExperience(current);
      const step = nextStep(current);

      onExperienceRef.current(experience);
      onStepRef.current(step, current, experience);
    };

    run();
    const timer = window.setInterval(run, tickMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, tickMs]);
}
