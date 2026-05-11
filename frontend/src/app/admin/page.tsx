"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Analytics = {
  occupancyRate: number;
  greenAvailabilityRate: number;
  totalReports: number;
  eventsInMemory: number;
  heatmap: Array<{ zone: "green" | "standard"; occupancyRate: number }>;
};

type Prediction = {
  slotId: number;
  currentlyAvailable: boolean;
  predictedAvailableAt: string;
  confidence: number;
};

type Report = {
  user: string;
  message: string;
  createdAt: string;
};

type LeaderboardItem = {
  user: string;
  points: number;
};

type HourlyHeat = {
  hour: number;
  zone: string;
  busyEvents: number;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [hourlyHeatmap, setHourlyHeatmap] = useState<HourlyHeat[]>([]);

  useEffect(() => {
    async function refresh() {
      const [analyticsRes, predictRes, reportRes, leaderboardRes, hourlyRes] = await Promise.all([
        fetch(`${backendUrl}/parking/analytics`),
        fetch(`${backendUrl}/parking/predict`),
        fetch(`${backendUrl}/parking/reports`),
        fetch(`${backendUrl}/parking/leaderboard`),
        fetch(`${backendUrl}/parking/heatmap-hourly`)
      ]);

      const analyticsData = (await analyticsRes.json()) as Analytics;
      const predictionData = (await predictRes.json()) as Prediction[];
      const reportData = (await reportRes.json()) as Report[];
      const leaderboardData = (await leaderboardRes.json()) as LeaderboardItem[];
      const hourlyData = (await hourlyRes.json()) as HourlyHeat[];

      setAnalytics(analyticsData);
      setPredictions(predictionData);
      setReports(reportData.slice(0, 8));
      setLeaderboard(leaderboardData);
      setHourlyHeatmap(hourlyData);
    }

    refresh().catch(() => {
      setAnalytics(null);
      setPredictions([]);
      setReports([]);
      setLeaderboard([]);
      setHourlyHeatmap([]);
    });

    const timer = setInterval(() => {
      refresh().catch(() => null);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>SaigonGreen - Admin Dashboard</h1>
        <Link href="/" className="adminBack">
          Back to Map
        </Link>
      </header>

      <section className="adminCards">
        <article>
          <h2>Occupancy</h2>
          <p>{analytics?.occupancyRate ?? 0}%</p>
        </article>
        <article>
          <h2>Green Availability</h2>
          <p>{analytics?.greenAvailabilityRate ?? 0}%</p>
        </article>
        <article>
          <h2>Community Reports</h2>
          <p>{analytics?.totalReports ?? 0}</p>
        </article>
        <article>
          <h2>Realtime Events</h2>
          <p>{analytics?.eventsInMemory ?? 0}</p>
        </article>
      </section>

      <section className="adminGrid">
        <article className="adminPanel">
          <h3>Zone Heatmap</h3>
          {(analytics?.heatmap || []).map((zone) => (
            <div key={zone.zone} className="heatRow">
              <span>{zone.zone}</span>
              <div className="heatTrack">
                <div style={{ width: `${Math.max(4, zone.occupancyRate)}%` }} className="heatValue" />
              </div>
              <strong>{zone.occupancyRate}%</strong>
            </div>
          ))}
        </article>

        <article className="adminPanel">
          <h3>Predictive Parking</h3>
          <div className="predictionList">
            {predictions.map((item) => (
              <div key={item.slotId} className="predictionItem">
                <span>Slot {item.slotId}</span>
                <span>{item.currentlyAvailable ? "Now available" : "Busy"}</span>
                <span>{new Date(item.predictedAvailableAt).toLocaleTimeString()}</span>
                <span>{Math.round(item.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="adminPanel">
        <h3>Latest User Reports</h3>
        <div className="reportList">
          {reports.length === 0 ? <p>No reports yet.</p> : null}
          {reports.map((report, index) => (
            <article key={`${report.createdAt}-${index}`} className="reportItem">
              <strong>{report.user}</strong>
              <p>{report.message}</p>
              <small>{new Date(report.createdAt).toLocaleString()}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="adminPanel">
        <h3>Eco Driver Ranking</h3>
        <div className="predictionList">
          {leaderboard.map((item, index) => (
            <div key={`${item.user}-${index}`} className="predictionItem">
              <span>#{index + 1}</span>
              <span>{item.user}</span>
              <span>{item.points} points</span>
              <span>{index === 0 ? "Top Eco" : "Active"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="adminPanel">
        <h3>Hourly Heatmap (Last 24h)</h3>
        <div className="predictionList">
          {hourlyHeatmap.map((item, index) => (
            <div key={`${item.hour}-${item.zone}-${index}`} className="predictionItem">
              <span>{item.hour}:00</span>
              <span>{item.zone}</span>
              <span>{item.busyEvents} busy events</span>
              <span>{item.busyEvents > 8 ? "Peak" : "Normal"}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
