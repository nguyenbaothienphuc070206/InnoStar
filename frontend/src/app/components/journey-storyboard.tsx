"use client";

import GlassCard from "./glass-card";
import { CityMood } from "../engine/cityEngine";
import { CampaignMission, JourneySummary, JourneyVisit, PersonaDebateLine } from "../engine/journey-mode";
import { DestinationIntelligence, Persona, PlaceData } from "../engine/place-narrative";

type JourneyStoryboardProps = {
  place: PlaceData | null;
  intelligence: DestinationIntelligence | null;
  visits: JourneyVisit[];
  missions: CampaignMission[];
  debateLines: PersonaDebateLine[];
  summary: JourneySummary;
  cityMood: CityMood;
  onChoosePersona: (persona: Persona) => void;
  onClose: () => void;
};

export default function JourneyStoryboard({
  place,
  intelligence,
  visits,
  missions,
  debateLines,
  summary,
  cityMood,
  onChoosePersona,
  onClose
}: JourneyStoryboardProps) {
  if (!place || !intelligence) {
    return null;
  }

  return (
    <GlassCard className="journeyStoryboard" data-testid="journey-storyboard">
      <header className="journeyHeader">
        <div>
          <p>Destination Intelligence</p>
          <h3>{place.name}</h3>
        </div>
        <button type="button" className="journeyCloseBtn" onClick={onClose}>
          Đóng
        </button>
      </header>

      <section className="journeySection journeyIntelligence">
        <div className="journeyStatGrid">
          <article>
            <span>Crowd</span>
            <strong>{intelligence.crowdLevel}</strong>
          </article>
          <article>
            <span>Best time</span>
            <strong>{intelligence.bestVisitTime}</strong>
          </article>
          <article>
            <span>Walkability</span>
            <strong>{intelligence.walkability}/10</strong>
          </article>
          <article>
            <span>Eco score</span>
            <strong>{intelligence.ecoScore}/100</strong>
          </article>
        </div>
        <p className="journeyStoryLine">{intelligence.walkingComfort}</p>
        <p className="journeyStoryLine">{intelligence.bestParkingStrategy}</p>
      </section>

      <section className="journeySection">
        <div className="journeySectionHeader">
          <strong>Green Journey Timeline</strong>
          <span>{summary.visitedCount} điểm đã đi</span>
        </div>
        <ul className="journeyTimelineList">
          {visits.slice(-4).reverse().map((visit) => (
            <li key={visit.id} className="journeyTimelineItem">
              <strong>{visit.name}</strong>
              <span>{visit.impact}</span>
              <small>
                {visit.bestVisitTime} • {visit.crowdLevel} crowd • {visit.hiddenPath}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className="journeySection">
        <div className="journeySectionHeader">
          <strong>Story Campaign Mode</strong>
          <span className="journeyBadge">{summary.badge}</span>
        </div>
        <div className="campaignMissionList">
          {missions.map((mission) => (
            <article key={mission.id} className={`campaignMission ${mission.completed ? "completed" : "pending"}`}>
              <strong>{mission.title}</strong>
              <span>{mission.objective}</span>
              <small>{mission.reward}</small>
            </article>
          ))}
        </div>
        <p className="journeyStoryLine journeyStatsLine">
          {summary.totalCo2SavedKg}kg CO₂ saved • {summary.totalWalkingMinutes} phút đi bộ • {summary.congestionAvoided} congestion zones avoided
        </p>
      </section>

      <section className="journeySection">
        <div className="journeySectionHeader">
          <strong>Twin Persona Debate</strong>
          <span>{cityMood}</span>
        </div>
        <div className="debateLineList">
          {debateLines.map((line) => (
            <article key={line.persona} className="debateLineItem">
              <button type="button" className="debatePickBtn" onClick={() => onChoosePersona(line.persona)}>
                {line.label}
              </button>
              <p>{line.line}</p>
            </article>
          ))}
        </div>
      </section>
    </GlassCard>
  );
}