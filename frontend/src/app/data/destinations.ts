export interface Challenge {
  id: string;
  question: string;
  qrCode: string;
  reward: number;
}

export interface Destination {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  shortDescription: string;
  fullStory: string;
  greenHint: string;
  qrChallenges: Challenge[];
  transportReward: {
    bike: number;
    ev: number;
    walk: number;
  };
  unlockScore: number;
  verifiedBy?: string;
}

export const destinations: Destination[] = [
  {
    id: "cuchi",
    name: "Cu Chi Tunnels",
    category: "history",
    lat: 11.1434,
    lng: 106.462,
    shortDescription: "An underground tunnel network closely tied to the resistance era.",
    fullStory:
      "This was once a hidden defense system with field hospitals, Hoang Cam kitchens, and communication routes that supported forces in difficult times.",
    greenHint: "Park outside the gate and walk in to experience the site at a calmer pace.",
    transportReward: {
      bike: 20,
      ev: 25,
      walk: 30
    },
    unlockScore: 60,
    verifiedBy: "HCMC Tourism Board",
    qrChallenges: [
      {
        id: "cuchi-1",
        question: "Find the plaque that marks the tunnel expansion year.",
        qrCode: "QR_CUCHI_001",
        reward: 15
      }
    ]
  },
  {
    id: "independence-palace",
    name: "Independence Palace",
    category: "history",
    lat: 10.7781,
    lng: 106.6953,
    shortDescription: "An architectural icon and a key landmark in modern Vietnamese history.",
    fullStory:
      "The palace sits at the intersection of history, architecture, and diplomacy. Its preserved interiors and underground bunker create a vivid visitor experience.",
    greenHint: "Prefer EV access or walk from the parking lot to keep the center airy.",
    transportReward: {
      bike: 16,
      ev: 22,
      walk: 26
    },
    unlockScore: 50,
    verifiedBy: "HCMC Tourism Board",
    qrChallenges: [
      {
        id: "palace-1",
        question: "Find the information about the historic meeting room in the central wing.",
        qrCode: "QR_DDL_001",
        reward: 14
      }
    ]
  }
];
