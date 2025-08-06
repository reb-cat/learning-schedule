import React from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="flex items-center justify-between mb-4 pb-2 border-b">
      <div className="flex items-center gap-2 text-sm">
        <Button 
          variant={isParentActive ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate('/parent')}
          className="h-7 px-2 text-xs"
        >
          <Users className="h-3 w-3 mr-1" />
          Parent
          {isParentActive && <Badge variant="secondary" className="ml-1 text-xs px-1">Current</Badge>}
        </Button>
        
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        
        <Button 
          variant={isAdminActive ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate('/admin')}
          className="h-7 px-2 text-xs"
        >
          <Settings className="h-3 w-3 mr-1" />
          Admin
          {isAdminActive && <Badge variant="secondary" className="ml-1 text-xs px-1">Current</Badge>}
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {isParentActive && "Student progress & task management"}
        {isAdminActive && "System operations & diagnostics"}
      </div>
    </div>
  );
}