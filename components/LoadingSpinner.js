import React from 'react';

/**
 * LoadingSpinner Component
 * A simple animated loading spinner.
 */
const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-8">
      {/* Spinner animation */}
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-accent"></div>
    </div>
  );
};

export default LoadingSpinner;
