import { ImageResponse } from 'next/og';
import { logoBase64 } from '@/lib/logoBase64';

export const dynamic = 'force-static';

// Route segment config
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          borderRadius: '4px',
        }}
      >
        <img 
          src={logoBase64} 
          style={{ width: '85%', height: '85%', objectFit: 'contain' }} 
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
