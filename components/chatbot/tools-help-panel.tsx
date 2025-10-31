"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Sparkles,
  Clock,
  GraduationCap,
  School,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  name: string;
  icon: any;
  color: string;
  description: string;
  examples: string[];
  category: "data" | "analysis" | "generation";
}

const availableTools: Tool[] = [
  {
    name: "Student Query",
    icon: Users,
    color: "text-blue-600",
    description: "Search and filter students by various criteria including GPA, graduation year, and application progress.",
    examples: [
      "Show me students with GPA above 3.8",
      "Find students graduating in 2025",
      "List high-achieving students with low progress",
    ],
    category: "data",
  },
  {
    name: "Task Management",
    icon: Calendar,
    color: "text-purple-600",
    description: "View, create, and analyze tasks and deadlines for students and applications.",
    examples: [
      "What deadlines are coming up this week?",
      "Show overdue tasks",
      "List all pending application deadlines",
    ],
    category: "data",
  },
  {
    name: "College Information",
    icon: School,
    color: "text-orange-600",
    description: "Query college application data, admission rates, and student college lists.",
    examples: [
      "Most popular colleges this year",
      "Show reach schools for top students",
      "List colleges with Early Decision deadlines",
    ],
    category: "data",
  },
  {
    name: "Statistics Calculator",
    icon: TrendingUp,
    color: "text-green-600",
    description: "Calculate averages, distributions, and trends across student data and applications.",
    examples: [
      "Calculate average application progress",
      "Show GPA distribution for class of 2025",
      "Analyze progress trends over time",
    ],
    category: "analysis",
  },
  {
    name: "Deadline Monitor",
    icon: Clock,
    color: "text-red-600",
    description: "Monitor upcoming deadlines and identify students at risk of missing important dates.",
    examples: [
      "Which students have deadlines in the next 7 days?",
      "Find students with clustered deadlines",
      "Alert me about Early Decision deadlines",
    ],
    category: "analysis",
  },
  {
    name: "Insight Generator",
    icon: Sparkles,
    color: "text-indigo-600",
    description: "Generate actionable insights and recommendations based on student data and progress patterns.",
    examples: [
      "Generate insights about at-risk students",
      "Identify students needing attention",
      "Recommend actions based on current data",
    ],
    category: "analysis",
  },
  {
    name: "Letter Generator",
    icon: FileText,
    color: "text-amber-600",
    description: "Generate personalized Letters of Recommendation based on student profiles and achievements.",
    examples: [
      "Generate a Letter of Recommendation for [student name]",
      "Create a college recommendation letter",
      "Draft a recommendation for scholarship application",
    ],
    category: "generation",
  },
];

export function ToolsHelpPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "data" | "analysis" | "generation">("all");

  const filteredTools = selectedCategory === "all"
    ? availableTools
    : availableTools.filter(tool => tool.category === selectedCategory);

  const categories = [
    { id: "all" as const, label: "All Tools", icon: Database, count: availableTools.length },
    { id: "data" as const, label: "Data Queries", icon: Users, count: availableTools.filter(t => t.category === "data").length },
    { id: "analysis" as const, label: "Analysis", icon: TrendingUp, count: availableTools.filter(t => t.category === "analysis").length },
    { id: "generation" as const, label: "Generation", icon: Sparkles, count: availableTools.filter(t => t.category === "generation").length },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Available AI Tools</CardTitle>
            </div>
            <CardDescription>
              I have access to {availableTools.length} specialized tools to help you manage your college counseling workflow
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-primary/10 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "transition-all duration-200",
                    selectedCategory === category.id && "shadow-md"
                  )}
                >
                  <Icon className="h-3 w-3 mr-1.5" />
                  {category.label}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {category.count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Tools Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.name}
                  className="group rounded-lg border border-border/50 bg-surface/50 p-4 hover:border-primary/30 hover:bg-surface/80 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "rounded-lg p-2 bg-background transition-transform duration-300 group-hover:scale-110",
                      tool.color.replace("text-", "bg-").replace("600", "100")
                    )}>
                      <Icon className={cn("h-4 w-4", tool.color)} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm text-text-primary">{tool.name}</h4>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-text-tertiary">Try asking:</p>
                        <ul className="space-y-1">
                          {tool.examples.slice(0, 2).map((example, idx) => (
                            <li key={idx} className="text-xs text-text-secondary/80 flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              <span className="italic">&ldquo;{example}&rdquo;</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Tips */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary">Quick Tips</p>
                <ul className="space-y-1 text-xs text-text-secondary">
                  <li>• Be specific with your queries for better results</li>
                  <li>• I can combine multiple tools to answer complex questions</li>
                  <li>• Ask follow-up questions to drill deeper into the data</li>
                  <li>• Use natural language - no need for exact commands</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
