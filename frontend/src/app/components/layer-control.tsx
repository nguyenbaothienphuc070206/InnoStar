"use client";

import { LayersState } from "./types";

type LayerControlProps = {
  layers: LayersState;
  onToggle: (layer: keyof LayersState) => void;
};

export default function LayerControl({ layers, onToggle }: LayerControlProps) {
  return (
    <section className="layerControl">
      <button data-testid="layer-parking" aria-pressed={layers.parking} onClick={() => onToggle("parking")} className={layers.parking ? "active" : ""}>
        Parking
      </button>
      <button data-testid="layer-camera" aria-pressed={layers.camera} onClick={() => onToggle("camera")} className={layers.camera ? "active" : ""}>
        Camera
      </button>
      <button data-testid="layer-traffic" aria-pressed={layers.traffic} onClick={() => onToggle("traffic")} className={layers.traffic ? "active" : ""}>
        Traffic
      </button>
      <button data-testid="layer-route" aria-pressed={layers.route} onClick={() => onToggle("route")} className={layers.route ? "active" : ""}>
        Route
      </button>
    </section>
  );
}
