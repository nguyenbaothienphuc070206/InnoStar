"use client";

import { destinations } from "../data/destinations";

type JourneyPassportProps = {
  profileName: string;
  personaLabel: string;
  visitedIds: string[];
  transportUsed: string[];
  greenScore: number;
  rank: string;
};

export default function JourneyPassport({ profileName, personaLabel, visitedIds, transportUsed, greenScore, rank }: JourneyPassportProps) {
  const visitedNames = visitedIds
    .map((id) => destinations.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  const walkedActions = transportUsed.filter((item) => item === "walk").length;
  const evActions = transportUsed.filter((item) => item === "ev").length;
  const estimatedKmWalked = Number((walkedActions * 0.9).toFixed(1));
  const estimatedCo2 = Number((greenScore / 20).toFixed(1));

  return (
    <aside className="journeyPassport" data-testid="journey-passport">
      <div className="journeyPassportHeader">
        <h3>{profileName || "Traveler"}'s Eco Passport</h3>
        <span className="passportBadge">{rank}</span>
      </div>

      <div className="passportMetricGrid">
        <article>
          <span>🌱 Impact</span>
          <strong>Saved {estimatedCo2}kg CO2</strong>
        </article>
        <article>
          <span>👣 Distance</span>
          <strong>{estimatedKmWalked}km walked</strong>
        </article>
        <article>
          <span>⚡ EV Trips</span>
          <strong>{evActions}</strong>
        </article>
        <article>
          <span>🎭 Persona</span>
          <strong>{personaLabel}</strong>
        </article>
      </div>

      <section>
        <strong>Visited</strong>
        {visitedNames.length ? (
          <ul>
            {visitedNames.slice(-4).map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p>Chưa có điểm đã tham quan.</p>
        )}
      </section>

      <section>
        <strong>Green actions</strong>
        <p>Walked {estimatedKmWalked}km</p>
        <p>Used EV route {evActions} times</p>
      </section>

      <section>
        <strong>Persona path</strong>
        <p>{personaLabel}</p>
      </section>

    </aside>
  );
}
