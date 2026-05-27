import { AIPlace } from "./useAICity";
import { Persona } from "./personaEngine";

export function getStory(persona: Persona, place: AIPlace) {
  if (persona === "COBA") {
    return `Cưng ơi, gần đây có ${place.name}, ${place.desc}, mình gửi xe rồi đi bộ nghen...`;
  }

  if (persona === "DRIVER") {
    return `${place.name} đó, gửi xe tiện, mát, đi bộ chút là tới.`;
  }

  return `Ê, ${place.name} nè, ${place.desc}, dân local hay ghé lắm.`;
}
