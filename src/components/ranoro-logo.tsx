// src/components/ranoro-logo.tsx

import React from 'react';
import Image from 'next/image';

const RanoroLogo = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Image 
        src="/ranoro-logo.png" 
        alt="Ranoro Logo" 
        width={40} 
        height={40} 
      />
      <span style={{ marginLeft: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>
        RANORO
      </span>
    </div>
  );
};

export default RanoroLogo;
