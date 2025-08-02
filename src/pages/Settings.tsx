import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CanvasSettings {
  apiUrl: string;
  apiToken: string;
  abigailCourseId: string;
  khalilCourseId: string;
}

const Settings = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState<CanvasSettings>({
    apiUrl: "",
    apiToken: "",
    abigailCourseId: "",
    khalilCourseId: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Simple PIN protection (1234)
  const SETTINGS_PIN = "1234";

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSettings = () => {
    const saved = localStorage.getItem("canvasSettings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SETTINGS_PIN) {
      setIsAuthenticated(true);
      setPin("");
    } else {
      toast({
        title: "Incorrect PIN",
        description: "Please try again.",
        variant: "destructive"
      });
      setPin("");
    }
  };

  const handleSave = () => {
    localStorage.setItem("canvasSettings", JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Canvas settings have been saved successfully."
    });
  };

  const handleInputChange = (field: keyof CanvasSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Enter PIN to Access Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pin">PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN"
                    maxLength={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Access Settings
                  </Button>
                  <Link to="/">
                    <Button variant="outline" size="icon">
                      <Home size={16} />
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Canvas Settings</h1>
          <Link to="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home size={16} />
              Home
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Canvas LMS Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">Canvas API URL</Label>
              <Input
                id="apiUrl"
                value={settings.apiUrl}
                onChange={(e) => handleInputChange("apiUrl", e.target.value)}
                placeholder="https://yourschool.instructure.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token</Label>
              <div className="relative">
                <Input
                  id="apiToken"
                  type={showToken ? "text" : "password"}
                  value={settings.apiToken}
                  onChange={(e) => handleInputChange("apiToken", e.target.value)}
                  placeholder="Enter Canvas API token"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="abigailCourseId">Abigail's Course ID</Label>
                <Input
                  id="abigailCourseId"
                  value={settings.abigailCourseId}
                  onChange={(e) => handleInputChange("abigailCourseId", e.target.value)}
                  placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="khalilCourseId">Khalil's Course ID</Label>
                <Input
                  id="khalilCourseId"
                  value={settings.khalilCourseId}
                  onChange={(e) => handleInputChange("khalilCourseId", e.target.value)}
                  placeholder="12346"
                />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save size={16} className="mr-2" />
              Save Settings
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 text-sm text-muted-foreground">
          <p><strong>Note:</strong> To get your API token, go to Canvas → Account → Settings → Approved Integrations → New Access Token</p>
          <p><strong>Course IDs:</strong> Found in the URL when viewing a course (e.g., /courses/12345)</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;