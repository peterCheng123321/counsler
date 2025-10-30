"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Brain,
  Clock,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Calendar,
  Target,
  Zap,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AgentConfig {
  id: string;
  daily_digest_enabled: boolean;
  daily_digest_time: string;
  deadline_monitor_enabled: boolean;
  deadline_monitor_interval_hours: number;
  risk_assessment_enabled: boolean;
  risk_assessment_interval_hours: number;
  max_runs_per_hour: number;
  max_insights_per_run: number;
  autonomous_actions_enabled: boolean;
  notification_preferences: {
    email: boolean;
    in_app: boolean;
  };
}

interface AgentRun {
  id: string;
  run_type: string;
  status: string;
  insights_count: number;
  tools_used: string[];
  execution_time_ms: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

interface AgentInsight {
  id: string;
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
  status: string;
  created_at: string;
  agent_runs?: {
    run_type: string;
    started_at: string;
  };
}

export default function AgentDashboardPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningManual, setRunningManual] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch config
      const configRes = await fetch("/api/v1/agent/config");
      const configData = await configRes.json();
      if (configData.success) {
        setConfig(configData.config);
      }

      // Fetch recent runs
      const runsRes = await fetch("/api/cron/agent-run");
      const runsData = await runsRes.json();
      if (runsData.success) {
        setRuns(runsData.recentRuns || []);
      }

      // Fetch active insights
      const insightsRes = await fetch("/api/v1/agent/insights?status=active&limit=20");
      const insightsData = await insightsRes.json();
      if (insightsData.success) {
        setInsights(insightsData.insights || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<AgentConfig>) => {
    if (!config) return;

    setSaving(true);
    try {
      const res = await fetch("/api/v1/agent/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        toast.success("Configuration updated");
      } else {
        toast.error(data.error || "Failed to update configuration");
      }
    } catch (error) {
      console.error("Failed to update config:", error);
      toast.error("Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  const runManualAgent = async () => {
    setRunningManual(true);
    try {
      const res = await fetch("/api/cron/agent-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runType: "manual" }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Agent run completed! Generated ${data.insightsGenerated} insights`);
        // Refresh dashboard
        fetchDashboardData();
      } else if (data.blocked) {
        toast.warning(data.reason);
      } else {
        toast.error(data.error || "Failed to run agent");
      }
    } catch (error) {
      console.error("Failed to run agent:", error);
      toast.error("Failed to run agent");
    } finally {
      setRunningManual(false);
    }
  };

  const updateInsightStatus = async (insightId: string, status: string) => {
    try {
      const res = await fetch("/api/v1/agent/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId, status }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Insight updated");
        // Remove from list if dismissed
        if (status === "dismissed") {
          setInsights(insights.filter((i) => i.id !== insightId));
        } else {
          // Update status in list
          setInsights(
            insights.map((i) => (i.id === insightId ? { ...i, status } : i))
          );
        }
      } else {
        toast.error(data.error || "Failed to update insight");
      }
    } catch (error) {
      console.error("Failed to update insight:", error);
      toast.error("Failed to update insight");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-amber-500" />
              <div>
                <CardTitle>Agent Dashboard Setup Required</CardTitle>
                <CardDescription>Database tables need to be created</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                The agent system requires database tables that don't exist yet. This is a one-time setup.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Quick Setup Steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary">
                <li>
                  Open{" "}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Supabase Dashboard
                  </a>
                </li>
                <li>Go to <strong>SQL Editor</strong> → <strong>New Query</strong></li>
                <li>Copy and run the SQL from <code className="bg-surface px-1 py-0.5 rounded">FIX_AGENT_DASHBOARD.md</code></li>
                <li>Go to <strong>Settings</strong> → <strong>API</strong> → Click <strong>"Reload schema"</strong></li>
                <li>Wait 30 seconds, then refresh this page</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => window.open("https://github.com/peterCheng123321/counsler/blob/main/FIX_AGENT_DASHBOARD.md", "_blank")}
                variant="default"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                View Setup Instructions
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
            </div>

            <div className="text-xs text-text-tertiary pt-2 border-t">
              <p>This one-time setup creates 3 tables: agent_config, agent_runs, and agent_insights</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    low: "bg-blue-100 text-blue-700 border-blue-300",
  };

  const statusIcons = {
    completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    failed: <XCircle className="h-4 w-4 text-red-600" />,
    running: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Agent Dashboard
          </h1>
          <p className="text-text-secondary mt-1">
            Monitor and configure your autonomous AI agent
          </p>
        </div>
        <Button
          onClick={runManualAgent}
          disabled={runningManual}
          className="bg-primary hover:bg-primary-hover"
        >
          {runningManual ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Run Agent Now
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Runs (24h)</p>
                <p className="text-2xl font-bold text-text-primary">{runs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Active Insights</p>
                <p className="text-2xl font-bold text-text-primary">{insights.length}</p>
              </div>
              <Sparkles className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Success Rate</p>
                <p className="text-2xl font-bold text-text-primary">
                  {runs.length > 0
                    ? Math.round(
                        (runs.filter((r) => r.status === "completed").length /
                          runs.length) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Avg. Exec Time</p>
                <p className="text-2xl font-bold text-text-primary">
                  {runs.length > 0
                    ? Math.round(
                        runs.reduce((acc, r) => acc + (r.execution_time_ms || 0), 0) /
                          runs.length /
                          1000
                      )
                    : 0}
                  s
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">
            <Sparkles className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="runs">
            <Activity className="h-4 w-4 mr-2" />
            Recent Runs
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Insights</CardTitle>
              <CardDescription>
                AI-generated insights and recommendations for your students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active insights yet</p>
                  <p className="text-sm">Run the agent to generate insights</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="border rounded-lg p-4 space-y-3 bg-surface/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={priorityColors[insight.priority]}>
                            {insight.priority}
                          </Badge>
                          <Badge variant="outline">{insight.category}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateInsightStatus(insight.id, "acted_on")}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Act On
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateInsightStatus(insight.id, "dismissed")}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-text-primary mb-1">
                          {insight.finding}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {insight.recommendation}
                        </p>
                      </div>

                      <div className="text-xs text-text-tertiary">
                        Generated {format(new Date(insight.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Runs</CardTitle>
              <CardDescription>
                Execution history and performance metrics (last 24 hours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No runs in the last 24 hours</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      className="border rounded-lg p-4 space-y-2 bg-surface/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcons[run.status as keyof typeof statusIcons]}
                          <span className="font-medium text-text-primary capitalize">
                            {run.run_type.replace("_", " ")}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {run.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-text-secondary">
                          {format(new Date(run.started_at), "MMM d, h:mm a")}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-text-secondary">Insights:</span>
                          <span className="ml-2 font-medium text-text-primary">
                            {run.insights_count}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary">Tools Used:</span>
                          <span className="ml-2 font-medium text-text-primary">
                            {run.tools_used?.length || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary">Time:</span>
                          <span className="ml-2 font-medium text-text-primary">
                            {Math.round((run.execution_time_ms || 0) / 1000)}s
                          </span>
                        </div>
                      </div>

                      {run.error_message && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {run.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>
                Configure agent behavior and rate limiting to prevent backend overload
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Daily Digest */}
              <div className="space-y-3 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base font-medium">Daily Digest</Label>
                      <p className="text-sm text-text-secondary">
                        Generate daily summary of student progress and tasks
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.daily_digest_enabled}
                    onCheckedChange={(checked) =>
                      updateConfig({ daily_digest_enabled: checked })
                    }
                    disabled={saving}
                  />
                </div>
                {config.daily_digest_enabled && (
                  <div className="ml-8">
                    <Label className="text-sm">Run Time</Label>
                    <Input
                      type="time"
                      value={config.daily_digest_time}
                      onChange={(e) =>
                        updateConfig({ daily_digest_time: e.target.value + ":00" })
                      }
                      className="w-40 mt-1"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              {/* Deadline Monitor */}
              <div className="space-y-3 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base font-medium">Deadline Monitor</Label>
                      <p className="text-sm text-text-secondary">
                        Monitor upcoming deadlines and critical items
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.deadline_monitor_enabled}
                    onCheckedChange={(checked) =>
                      updateConfig({ deadline_monitor_enabled: checked })
                    }
                    disabled={saving}
                  />
                </div>
                {config.deadline_monitor_enabled && (
                  <div className="ml-8">
                    <Label className="text-sm">Check Interval (hours, min 6)</Label>
                    <Input
                      type="number"
                      min="6"
                      max="24"
                      value={config.deadline_monitor_interval_hours}
                      onChange={(e) =>
                        updateConfig({
                          deadline_monitor_interval_hours: parseInt(e.target.value),
                        })
                      }
                      className="w-40 mt-1"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              {/* Risk Assessment */}
              <div className="space-y-3 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base font-medium">Risk Assessment</Label>
                      <p className="text-sm text-text-secondary">
                        Identify students falling behind and concerning trends
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.risk_assessment_enabled}
                    onCheckedChange={(checked) =>
                      updateConfig({ risk_assessment_enabled: checked })
                    }
                    disabled={saving}
                  />
                </div>
                {config.risk_assessment_enabled && (
                  <div className="ml-8">
                    <Label className="text-sm">Check Interval (hours, min 12)</Label>
                    <Input
                      type="number"
                      min="12"
                      max="168"
                      value={config.risk_assessment_interval_hours}
                      onChange={(e) =>
                        updateConfig({
                          risk_assessment_interval_hours: parseInt(e.target.value),
                        })
                      }
                      className="w-40 mt-1"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              {/* Rate Limiting */}
              <div className="space-y-3 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-base font-medium">Rate Limiting</Label>
                    <p className="text-sm text-text-secondary">
                      Prevent backend overload with usage limits
                    </p>
                  </div>
                </div>
                <div className="ml-8 space-y-3">
                  <div>
                    <Label className="text-sm">Max Runs Per Hour (1-10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={config.max_runs_per_hour}
                      onChange={(e) =>
                        updateConfig({
                          max_runs_per_hour: parseInt(e.target.value),
                        })
                      }
                      className="w-40 mt-1"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Max Insights Per Run (1-20)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={config.max_insights_per_run}
                      onChange={(e) =>
                        updateConfig({
                          max_insights_per_run: parseInt(e.target.value),
                        })
                      }
                      className="w-40 mt-1"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* Autonomous Actions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base font-medium">Autonomous Actions</Label>
                      <p className="text-sm text-text-secondary">
                        Allow agent to take actions without confirmation (experimental)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.autonomous_actions_enabled}
                    onCheckedChange={(checked) =>
                      updateConfig({ autonomous_actions_enabled: checked })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
