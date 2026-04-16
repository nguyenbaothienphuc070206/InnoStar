"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";

const LiveMap = dynamic(() => import("./components/live-map"), { ssr: false });

type Slot = {
  id: number;
  type: "car" | "bike";
  zone: "green" | "standard";
  available: boolean;
  x: number;
  y: number;
  updatedAt?: string;
};

type RouteSuggestion = {
  distance: number;
  emission: "low" | "medium" | "high";
  score: number;
  etaMinutes: number;
  destination: string;
  path: Array<[number, number]>;
};

type PersonalizedPlan = {
  user: string;
  destination: string;
  theme: string;
  bestTime: string;
  suggestion: string;
  route: RouteSuggestion;
};

type AuthResult = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    ecoPoints: number;
  };
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";
const backendWsUrl = backendUrl.replace(/\/api\/v1\/?$/, "");
const cameraStreamUrl = process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || "http://localhost:8000/live";

const initialSlots: Slot[] = [
  { id: 1, type: "car", zone: "green", available: true, x: 20, y: 22 },
  { id: 2, type: "car", zone: "standard", available: false, x: 34, y: 38 },
  { id: 3, type: "bike", zone: "green", available: true, x: 58, y: 31 },
  { id: 4, type: "bike", zone: "standard", available: false, x: 67, y: 64 },
  { id: 5, type: "car", zone: "green", available: true, x: 79, y: 44 }
];

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [query, setQuery] = useState("Ben Thanh Market");
  const [email, setEmail] = useState("eco@greenpark.local");
  const [password, setPassword] = useState("123456");
  const [username, setUsername] = useState("Eco Traveler");
  const [token, setToken] = useState("");
  const [co2SavedKg, setCo2SavedKg] = useState(4.8);
  const [route, setRoute] = useState<RouteSuggestion | null>(null);
  const [personalPlan, setPersonalPlan] = useState<PersonalizedPlan | null>(null);
  const [ecoBadge, setEcoBadge] = useState("Green Starter");
  const [ecoPoints, setEcoPoints] = useState(0);
  const [report, setReport] = useState("");
  const [statusMessage, setStatusMessage] = useState("Live connected");

  useEffect(() => {
    const cachedName = window.localStorage.getItem("greenpark-user");
    const cachedToken = window.localStorage.getItem("greenpark-token");
    if (cachedName) {
      setUsername(cachedName);
    }
    if (cachedToken) {
      setToken(cachedToken);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("greenpark-user", username);
  }, [username]);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem("greenpark-token", token);
      fetch(`${backendUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((profile) => {
          if (profile?.displayName) {
            setUsername(profile.displayName);
          }
        })
        .catch(() => null);
    }
  }, [token]);

  useEffect(() => {
    async function loadPersonalPlan() {
      try {
        const response = await fetch(
          `${backendUrl}/parking/personalized?user=${encodeURIComponent(username)}&interest=${encodeURIComponent(query)}`
        );
        const data = (await response.json()) as PersonalizedPlan;
        setPersonalPlan(data);
      } catch {
        setPersonalPlan(null);
      }
    }

    loadPersonalPlan().catch(() => null);
  }, [username]);

  useEffect(() => {
    let socket: Socket | undefined;

    try {
      socket = io(backendWsUrl, { transports: ["websocket"] });

      socket.on("connect", () => setStatusMessage("Live connected"));
      socket.on("disconnect", () => setStatusMessage("Live disconnected"));
      socket.on("parking-update", (data: Slot[]) => {
        if (Array.isArray(data)) {
          setSlots(data);
        }
      });
    } catch {
      setStatusMessage("Live unavailable");
    }

    return () => {
      socket?.disconnect();
    };
  }, []);

  const stats = useMemo(() => {
    const available = slots.filter((slot) => slot.available).length;
    const greenAvailable = slots.filter((slot) => slot.available && slot.zone === "green").length;
    const score = Math.round((greenAvailable / Math.max(1, slots.length)) * 100);
    return { available, greenAvailable, score };
  }, [slots]);

  async function findParking() {
    try {
      const response = await fetch(`${backendUrl}/parking/route?destination=${encodeURIComponent(query)}`);
      const data = (await response.json()) as RouteSuggestion;
      setRoute(data);
      setCo2SavedKg((value) => Number((value + 0.35).toFixed(2)));

      const checkinResponse = await fetch(`${backendUrl}/parking/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username, mode: "bike" })
      });
      const checkinData = (await checkinResponse.json()) as { badge: string; totalPoints: number };
      setEcoBadge(checkinData.badge);
      setEcoPoints(checkinData.totalPoints);
    } catch {
      setStatusMessage("Route API unavailable");
    }
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!report.trim()) return;

    try {
      await fetch(`${backendUrl}/parking/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: report, user: username })
      });
      setReport("");
      setStatusMessage("Thanks for your community report");
    } catch {
      setStatusMessage("Could not send report");
    }
  }

  async function runAuth(mode: "login" | "register") {
    const response = await fetch(`${backendUrl}/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName: username })
    });
    if (!response.ok) {
      setStatusMessage(`${mode} failed`);
      return;
    }

    const data = (await response.json()) as AuthResult;
    setToken(data.accessToken);
    setUsername(data.user.displayName);
    setEcoPoints(data.user.ecoPoints);
    setStatusMessage(`${mode} success`);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("photo");
    if (!(file instanceof File)) {
      return;
    }

    const body = new FormData();
    body.append("photo", file);

    try {
      await fetch(`${backendUrl}/parking/upload`, { method: "POST", body });
      setStatusMessage("Photo uploaded for AI review");
      event.currentTarget.reset();
    } catch {
      setStatusMessage("Upload failed");
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">GreenPark AI</div>

        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search destination in Ho Chi Minh City"
        />

        <div className="score">Green Score: {route?.score ?? stats.score}</div>

        <div className="profile">
          <input value={username} onChange={(event) => setUsername(event.target.value)} aria-label="Profile name" />
        </div>

        <Link href="/admin" className="adminLink">
          Admin
        </Link>
      </header>

      <section className="authBar">
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
        <button onClick={() => runAuth("register")}>Register</button>
        <button onClick={() => runAuth("login")}>Login</button>
      </section>

      <section className="mapPanel">
        <LiveMap slots={slots} routePath={route?.path || []} />
        <div className="mapOverlay" />
        <div className="mapGrid" />

        {slots.map((slot) => (
          <button
            key={slot.id}
            className={`slot ${slot.available ? "available" : "occupied"} ${slot.zone === "green" ? "greenZone" : "standardZone"}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            title={`Slot ${slot.id} • ${slot.type} • ${slot.zone}`}
            onClick={() => setStatusMessage(`Slot ${slot.id}: ${slot.available ? "available" : "occupied"}`)}
          >
            S{slot.id}
          </button>
        ))}

        <article className="panel panelLeft">
          <h2>Eco Journey</h2>
          <p>Status: {statusMessage}</p>
          <p>CO2 saved: {co2SavedKg} kg</p>
          <p>Green slots now: {stats.greenAvailable}</p>
          <p>
            Badge: {ecoBadge} ({ecoPoints} pts)
          </p>

          {personalPlan ? (
            <p>
              Today for {personalPlan.user}: {personalPlan.destination} at {personalPlan.bestTime}
            </p>
          ) : null}

          {route ? (
            <ul>
              <li>{route.destination}</li>
              <li>{route.distance} km</li>
              <li>Emission: {route.emission}</li>
              <li>ETA: {route.etaMinutes} minutes</li>
            </ul>
          ) : (
            <p>Tap Find Parking to get the best low-emission route.</p>
          )}
        </article>

        <article className="panel panelRight">
          <h2>Live Camera</h2>
          <video src={cameraStreamUrl} autoPlay muted loop playsInline className="camera" />

          <form onSubmit={handleUpload} className="uploader">
            <label htmlFor="photo">Upload real scene</label>
            <input id="photo" name="photo" type="file" accept="image/*" />
            <button type="submit">Send to AI</button>
          </form>
        </article>
      </section>

      <nav className="actions">
        <button onClick={findParking}>Find Parking</button>
        <button onClick={findParking}>Green Route</button>
        <button onClick={() => setStatusMessage("Live mode synced")}>Live View</button>
      </nav>

      <section className="community">
        <form onSubmit={submitReport} className="reportForm">
          <input
            value={report}
            onChange={(event) => setReport(event.target.value)}
            placeholder="Report parking status, shade, weather, or crowd"
          />
          <button type="submit">Send Report</button>
        </form>
      </section>
    </main>
  );
}
