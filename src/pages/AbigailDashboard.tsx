const AbigailDashboard = () => {
  console.log('🏠 AbigailDashboard rendering...');
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground">Welcome, Abigail!</h1>
        <p className="text-lg text-muted-foreground mt-1">Test Dashboard</p>
        <p className="mt-4">If you can see this, the component is working!</p>
      </div>
    </div>
  );
};

export default AbigailDashboard;