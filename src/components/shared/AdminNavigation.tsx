import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings, Users, ChevronRight } from 'lucide-react';

export function AdminNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isParentActive = currentPath === '/parent';
  const isAdminActive = currentPath === '/admin';

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Administration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button 
            variant={isParentActive ? "default" : "outline"}
            onClick={() => navigate('/parent')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Parent Dashboard
            {isParentActive && <Badge variant="secondary" className="ml-2">Current</Badge>}
          </Button>
          
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          
          <Button 
            variant={isAdminActive ? "default" : "outline"}
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Technical Admin
            {isAdminActive && <Badge variant="secondary" className="ml-2">Current</Badge>}
          </Button>
        </div>
        
        <div className="mt-3 text-sm text-muted-foreground">
          {isParentActive && "Monitor student progress and manage daily tasks"}
          {isAdminActive && "System operations, diagnostics, and technical controls"}
        </div>
      </CardContent>
    </Card>
  );
}