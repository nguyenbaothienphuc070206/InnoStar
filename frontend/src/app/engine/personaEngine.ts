export type Persona = "COBA" | "DRIVER" | "YOUTH";

export function inferPersona(state: { intent: "HURRY" | "EXPLORE" | "ECO" }): Persona {
  if (state.intent === "HURRY") {
    return "DRIVER";
  }
  if (state.intent === "EXPLORE") {
    return "COBA";
  }
  return "YOUTH";
}
