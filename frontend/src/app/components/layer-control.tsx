"use client";

import { LayersState } from "./types";

type LayerControlProps = {
  layers: LayersState;
  onToggle: (layer: keyof LayersState) => void;
};

export default function LayerControl({ layers, onToggle }: LayerControlProps) {
  return (
    <section className="layerControl">
      <button onClick={() => onToggle("parking")} className={layers.parking ? "active" : ""}>
        Parking
      </button>
      <button onClick={() => onToggle("camera")} className={layers.camera ? "active" : ""}>
        Camera
      </button>
      <button onClick={() => onToggle("traffic")} className={layers.traffic ? "active" : ""}>
        Traffic
      </button>
      <button onClick={() => onToggle("route")} className={layers.route ? "active" : ""}>
        Route
      </button>
    </section>
  );
}
