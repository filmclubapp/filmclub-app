"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type PassportQRProps = {
  url: string;
  /** Display size in CSS pixels (module generates at higher res for crisp QR). */
  displaySize?: number;
  className?: string;
};

export default function PassportQR({
  url,
  displaySize = 80,
  className = "",
}: PassportQRProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const renderW = Math.round(displaySize * 3);
    QRCode.toDataURL(url, {
      width: renderW,
      margin: 1,
      color: { dark: "#fdf9e3", light: "#1a0c0c" },
      errorCorrectionLevel: "H",
    })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, displaySize]);

  if (!src) {
    return (
      <div
        className={`shrink-0 rounded-md border border-[#fdf9e3]/15 bg-[#281414] ${className}`}
        style={{ width: displaySize, height: displaySize }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={displaySize}
      height={displaySize}
      className={`shrink-0 rounded-md border border-[#fdf9e3]/22 object-contain ${className}`}
      style={{ width: displaySize, height: displaySize }}
    />
  );
}
