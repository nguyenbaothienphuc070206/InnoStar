"use client";

import { useState } from "react";

export type PersonaKey = "coba" | "chutai" | "ut";

export const personas = {
  coba: {
    name: "Cô Ba",
    vibe: "Lịch sử & Nghệ thuật",
    avatar: "/images/coba.png",
    text: "Cưng gửi xe ở bãi S54 nha. Từ đó mình thong thả đi bộ qua Chợ Bến Thành, nghe chuyện Sài Gòn xưa.",
    parking: "S54",
    walk: "5 phút"
  },
  chutai: {
    name: "Chú Tài",
    vibe: "Đời sống địa phương",
    avatar: "/images/chutai.png",
    text: "Ra công viên 23/9 gửi xe cho khỏe. Rộng, mát, khỏi chen.",
    parking: "Công viên 23/9",
    walk: "4 phút"
  },
  ut: {
    name: "Út",
    vibe: "Hidden Gems",
    avatar: "/images/ut.png",
    text: "Đi theo tui vô hẻm. Có bãi giữ xe kín đáo rồi dẫn qua quán local chuẩn bài.",
    parking: "Bãi tổ dân phố",
    walk: "3 phút"
  }
};

interface GuideHubProps {
  activePersona?: PersonaKey;
  onPersonaChange?: (persona: PersonaKey) => void;
  onAction?: (action: "listen" | "view-route" | "start") => void;
}

export default function GuideHub({ 
  activePersona = "coba", 
  onPersonaChange,
  onAction 
}: GuideHubProps) {
  const [active, setActive] = useState<PersonaKey>(activePersona);
  const guide = personas[active];

  const handlePersonaChange = (key: PersonaKey) => {
    setActive(key);
    onPersonaChange?.(key);
  };

  return (
    <aside className="guide-panel">
      <h2>Story Journey</h2>

      <div className="persona-tabs">
        {(Object.keys(personas) as PersonaKey[]).map((key) => (
          <button
            key={key}
            className={active === key ? "active" : ""}
            onClick={() => handlePersonaChange(key)}
          >
            {personas[key].name}
          </button>
        ))}
      </div>

      <div className="guide-card">
        <img src={guide.avatar} alt={guide.name} className="guide-avatar" />

        <h3>{guide.name}</h3>
        <p className="guide-vibe">{guide.vibe}</p>

        <div className="story-box">
          {guide.text}
        </div>

        <div className="meta">
          <span>🅿 {guide.parking}</span>
          <span>🚶 {guide.walk}</span>
        </div>

        <div className="actions">
          <button onClick={() => onAction?.("listen")}>Nghe kể</button>
          <button onClick={() => onAction?.("view-route")}>Xem route</button>
          <button onClick={() => onAction?.("start")}>Bắt đầu</button>
        </div>
      </div>
    </aside>
  );
}
