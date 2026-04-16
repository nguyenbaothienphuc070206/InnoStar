"use client";

type TopBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  greenScore: number;
  profileName: string;
  onProfileNameChange: (value: string) => void;
};

export default function TopBar({ query, onQueryChange, greenScore, profileName, onProfileNameChange }: TopBarProps) {
  return (
    <header className="topBarShell">
      <div className="topLogo">GreenPark AI</div>

      <input
        className="topSearch"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search destination in Ho Chi Minh City"
      />

      <div className="topScore">Green Score {greenScore}</div>

      <input
        className="topProfile"
        value={profileName}
        onChange={(event) => onProfileNameChange(event.target.value)}
        placeholder="Profile name"
      />
    </header>
  );
}
