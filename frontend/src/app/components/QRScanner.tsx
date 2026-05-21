"use client";

import { useState } from "react";

type QRScannerProps = {
  onScan: (code: string) => void;
  disabled?: boolean;
};

export default function QRScanner({ onScan, disabled = false }: QRScannerProps) {
  const [code, setCode] = useState("");

  return (
    <div className="qrScanner">
      <input
        className="qrInput"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Nhap QR code, vi du: QR_CUCHI_001"
        disabled={disabled}
      />
      <button
        type="button"
        className="qrScanBtn"
        onClick={() => {
          onScan(code.trim());
          setCode("");
        }}
        disabled={disabled || !code.trim()}
      >
        Scan QR
      </button>
    </div>
  );
}
