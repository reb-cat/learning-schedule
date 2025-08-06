import React from 'react';

const SafeAbigailDashboard = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md w-full space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Emergency Dashboard</h1>
          <h2 className="text-2xl font-semibold text-muted-foreground">Abigail</h2>
          <p className="text-lg text-muted-foreground">Data Loading Disabled</p>
          <p className="text-sm text-muted-foreground">Static mode to prevent render loops</p>
        </div>
      </div>
    </div>
  );
};

export default SafeAbigailDashboard;