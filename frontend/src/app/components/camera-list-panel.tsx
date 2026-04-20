"use client";

import { memo, useMemo } from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import { Slot } from "./types";

type CameraListPanelProps = {
  slots: Slot[];
  searchTerm: string;
};

type CameraRowItem = {
  id: number;
  label: string;
  zone: string;
  online: boolean;
};

type RowData = {
  items: CameraRowItem[];
};

function CameraRow({ index, style, data }: ListChildComponentProps<RowData>) {
  const item = data.items[index];

  return (
    <div style={style} className="cameraListRow" data-testid={`camera-row-${item.id}`}>
      <strong>{item.label}</strong>
      <span>{item.zone}</span>
      <span className={item.online ? "online" : "offline"}>{item.online ? "Online" : "Offline"}</span>
    </div>
  );
}

function CameraListPanel({ slots, searchTerm }: CameraListPanelProps) {
  const items = useMemo<CameraRowItem[]>(() => {
    const lowered = searchTerm.trim().toLowerCase();

    return slots
      .filter((slot) => slot.cameraOnline)
      .map((slot) => ({
        id: slot.id,
        label: `Camera S${slot.id}`,
        zone: slot.zone,
        online: Boolean(slot.cameraOnline)
      }))
      .filter((item) => (lowered ? item.label.toLowerCase().includes(lowered) || item.zone.toLowerCase().includes(lowered) : true));
  }, [slots, searchTerm]);

  if (items.length === 0) {
    return <p className="cameraHint">No camera matches for "{searchTerm}"</p>;
  }

  return (
    <FixedSizeList
      height={190}
      width="100%"
      itemCount={items.length}
      itemSize={44}
      itemData={{ items }}
      className="cameraList"
      data-testid="camera-list"
    >
      {CameraRow}
    </FixedSizeList>
  );
}

export default memo(CameraListPanel);
