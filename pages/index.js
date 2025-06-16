// pages/index.js

import React from 'react';

/**
 * Simplified HomePage Component for debugging 404.
 * This component only renders a basic "Hello World" message.
 * If this page loads successfully, it indicates an issue within the
 * original HomePage component's logic or data fetching.
 */
const HomePage = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a202c', /* primary color */
      color: '#e2e8f0', /* textLight color */
      fontFamily: 'Inter, sans-serif',
      fontSize: '24px',
      textAlign: 'center',
      flexDirection: 'column'
    }}>
      <h1>Hello from Fantasy Football History!</h1>
      <p>If you see this, the app is working!</p>
      <p>We are troubleshooting the previous content.</p>
    </div>
  );
};

export default HomePage;
