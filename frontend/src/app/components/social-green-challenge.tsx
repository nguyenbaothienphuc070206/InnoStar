"use client";

type LeaderboardItem = {
  name: string;
  score: number;
};

type SocialGreenChallengeProps = {
  selfName: string;
  selfScore: number;
  visitedCount: number;
};

export default function SocialGreenChallenge({ selfName, selfScore, visitedCount }: SocialGreenChallengeProps) {
  const leaderboard: LeaderboardItem[] = [
    { name: "Minh", score: 220 },
    { name: "Phuc", score: 185 },
    { name: "Lan", score: 170 },
    { name: selfName || "You", score: selfScore }
  ].sort((a, b) => b.score - a.score);

  const weeklyTarget = 3;
  const progress = Math.min(weeklyTarget, visitedCount);

  return (
    <aside className="socialChallengeCard" data-testid="social-green-challenge">
      <header>
        <strong>Social Green Challenge</strong>
        <span>Week mission</span>
      </header>

      <p className="challengeText">Kham pha 3 di tich bang route xanh.</p>
      <p className="challengeProgress">
        Progress: {progress}/{weeklyTarget}
      </p>

      <ul>
        {leaderboard.map((item, index) => (
          <li key={`${item.name}-${index}`}>
            <span>{index + 1}. {item.name}</span>
            <strong>{item.score}</strong>
          </li>
        ))}
      </ul>

      {progress >= weeklyTarget ? <div className="challengeBadge">Weekly badge unlocked</div> : null}
    </aside>
  );
}
