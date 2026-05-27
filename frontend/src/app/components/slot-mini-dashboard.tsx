"use client";

import { motion } from "framer-motion";
import GlassCard from "./glass-card";
import { Slot } from "./types";

type SlotMiniDashboardProps = {
  slot: Slot | null;
  onNavigate: () => void;
  onOpenLiveView: () => void;
  routeLoading: boolean;
};

export default function SlotMiniDashboard({ slot }: SlotMiniDashboardProps) {
  if (!slot) {
    return null;
  }

  const personaStories = [
    {
      label: "Với Út",
      detail: "Út tìm được bãi kín gần hẻm Cô Giang.",
      hint: "Đi bộ 3 phút tới quán local."
    },
    {
      label: "Với Chú Tài",
      detail: `Bãi S${slot.id} còn trống.`,
      hint: "Ra vô nhanh, ít kẹt xe."
    },
    {
      label: "Với Cô Ba",
      detail: "Từ đây đi bộ qua tuyến đường cổ đẹp nhất."
    }
  ];

  return (
    <motion.aside
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="slotMiniDashboard"
      data-testid="slot-mini-dashboard"
    >
      <GlassCard className="slotMiniCard">
        <p className="slotPersonaKicker">Tuyến gợi ý theo nhân vật</p>
        <h4>Chọn hành trình phù hợp</h4>
        <div className="slotPersonaList">
          {personaStories.map((story) => (
            <article key={story.label} className="slotPersonaItem">
              <strong>{story.label}</strong>
              <span>{story.detail}</span>
              {story.hint ? <small>{story.hint}</small> : null}
            </article>
          ))}
        </div>
      </GlassCard>
    </motion.aside>
  );
}
