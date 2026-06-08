import { AIPlace } from "./useAICity";
import { Persona } from "./personaEngine";

export function getStory(persona: Persona, place: AIPlace) {
  if (persona === "COBA") {
    return `There is ${place.name} nearby, ${place.desc}; park first and walk over.`;
  }

  if (persona === "DRIVER") {
    return `${place.name} is close by, with easy parking and a short walk.`;
  }

  return `Check out ${place.name}; ${place.desc}. Locals go there a lot.`;
}
