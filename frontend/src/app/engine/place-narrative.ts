type Persona = "COBA" | "DRIVER" | "YOUTH";

export interface PlaceData {
  id: number;
  name: string;
  type: "history" | "daily" | "local";
  persona: Persona;
  lat: number;
  lng: number;
  overview: string;
  history: string;
  greenStoryHook: string;
  walkingRoute: string;
  ecoBenefit: string;
  recommendedParking: string;
  hiddenSpot: string;
}

export function generateNarrativeScript(place: PlaceData, persona: Persona): string[] {
  if (persona === "COBA") {
    return [
      `Đây là ${place.name}.`,
      place.overview,
      `${place.history}`,
      `Để cảm nhận trọn vẹn nơi này, ${place.greenStoryHook}`,
      `${place.walkingRoute}`,
      `${place.ecoBenefit}`,
      "Thong thả đi bộ mà cảm nhận, cưng. Đó là chất lượng cuộc sống thực sự."
    ];
  }

  if (persona === "DRIVER") {
    return [
      `${place.name} là chỗ đông khách.`,
      place.overview,
      `${place.greenStoryHook}`,
      `Anh chỉ em: ${place.recommendedParking}`,
      `Từ đó ${place.walkingRoute.split("→")[1] || "đi bộ vào"}`,
      `Vừa khỏi kẹt xe, vừa ${place.ecoBenefit.toLowerCase()}`,
      "Gọn lẹ, chẳng mất thời gian đâu."
    ];
  }

  // YOUTH
  return [
    `${place.name} không chỉ là check-in đâu.`,
    place.overview,
    `${place.history}`,
    `Chứ nó còn có cái hay là: ${place.greenStoryHook}`,
    `${place.walkingRoute}`,
    `Nghe có vẻ kỳ công nhưng thực ra ${place.hiddenSpot}`,
    `Vừa trải nghiệm authentic, vừa đỡ ồn ${place.recommendedParking.toLowerCase()}.`
  ];
}

export function generateGreenTips(place: PlaceData): string[] {
  return [
    `🚗 Gửi xe: ${place.recommendedParking}`,
    `🚶 Tuyến đi bộ: ${place.walkingRoute}`,
    `🌱 Lợi ích: ${place.ecoBenefit}`,
    `✨ Bí kíp local: ${place.hiddenSpot}`
  ];
}
