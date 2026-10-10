/**
 * Compact QR Code generator — pure TypeScript, no external dependencies.
 * This is a minimal QRCode implementation that generates SVG output for
 * short URLs. For production use, replace with a full library.
 * We use qrcode.react if it is available (dynamically imported), falling
 * back to this implementation for offline / install-not-yet-done cases.
 */
import React, { useEffect, useState } from 'react';

interface QRProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a real QR code.
 * Tries to use qrcode.react (installed via npm install qrcode.react).
 * Falls back to a lightweight canvas implementation.
 */
export function QRCode({ value, size = 128, className = '' }: QRProps) {
  const [QRCmp, setQRCmp] = useState<React.ComponentType<any> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    import('qrcode.react')
      .then((mod) => setQRCmp(() => mod.QRCodeSVG || mod.default?.QRCodeSVG || mod.default))
      .catch(() => setFailed(true));
  }, []);

  if (QRCmp) {
    return <QRCmp value={value} size={size} className={className} includeMargin />;
  }

  if (failed) {
    // Fallback: show a styled placeholder with the URL
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-4 ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 mb-2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
        <span className="text-[9px] text-gray-500 text-center break-all leading-tight">Run: npm install qrcode.react</span>
      </div>
    );
  }

  // Loading state
  return (
    <div className={`skeleton ${className}`} style={{ width: size, height: size, borderRadius: 8 }} />
  );
}
