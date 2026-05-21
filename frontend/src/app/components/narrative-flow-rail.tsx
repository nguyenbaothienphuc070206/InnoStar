"use client";

type NarrativeFlowRailProps = {
  activeStep: number;
  score: number;
};

const steps = [
  "Step 1: Chon persona",
  "Step 2: Chon destination",
  "Step 3: Route xanh duoc de xuat",
  "Step 4: Di chuyen",
  "Step 5: Scan checkpoint",
  "Step 6: Unlock deeper story",
  "Step 7: Earn score",
  "Step 8: Journey passport"
];

export default function NarrativeFlowRail({ activeStep, score }: NarrativeFlowRailProps) {
  return (
    <aside className="narrativeFlowRail" data-testid="narrative-flow-rail">
      <header>
        <strong>Journey Flow</strong>
        <span>Score: {score}</span>
      </header>
      <ol>
        {steps.map((step, index) => {
          const state = index + 1 < activeStep ? "done" : index + 1 === activeStep ? "active" : "todo";
          return (
            <li key={step} className={`flow-${state}`}>
              {step}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
