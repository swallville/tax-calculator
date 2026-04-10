import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Tax Calculator — Canadian Federal Income Tax';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1A1226',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            background: '#7C6AE8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: 'white',
          }}
        >
          $
        </div>
      </div>
      <div
        style={{
          fontSize: '48px',
          fontWeight: 700,
          color: '#F5F0FA',
          marginBottom: '12px',
        }}
      >
        Tax Calculator
      </div>
      <div
        style={{
          fontSize: '24px',
          color: '#B8AEC8',
        }}
      >
        Canadian Federal Income Tax • 2019-2022
      </div>
    </div>,
    { ...size },
  );
}
