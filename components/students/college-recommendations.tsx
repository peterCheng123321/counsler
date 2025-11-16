"use client";

import { useState } from "react";
import { GraduationCap, Sparkles, TrendingUp, Target, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Student } from "@/lib/api/client";

interface CollegeRecommendationsProps {
  student: Student;
}

interface CollegeRecommendation {
  name: string;
  type: "reach" | "match" | "safety";
  location: string;
  reason: string;
  acceptanceRate?: number;
  avgGPA?: number;
  avgSAT?: number;
}

export function CollegeRecommendations({ student }: CollegeRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<CollegeRecommendation[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      // Call the chatbot API with a specific prompt
      const response = await fetch("/api/v1/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Based on ${student.first_name} ${student.last_name}'s profile (GPA: ${student.gpa_unweighted || "N/A"}, SAT: ${student.sat_score || "N/A"}, ACT: ${student.act_score || "N/A"}), recommend 6 colleges: 2 reach schools, 2 match schools, and 2 safety schools. Consider their academic profile and provide specific reasons for each recommendation. Format as JSON array with: name, type (reach/match/safety), location, reason.`,
          stream: false,
          studentContext: {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            firstName: student.first_name,
            lastName: student.last_name,
            graduationYear: student.graduation_year,
            gpa: student.gpa_unweighted,
            sat: student.sat_score,
            act: student.act_score,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to generate recommendations");

      const data = await response.json();

      // Parse the response to extract college recommendations
      // The AI should return structured data
      const parsedRecs = parseRecommendations(data.data.message);
      setRecommendations(parsedRecs);
      setHasGenerated(true);

      toast.success("College recommendations generated!");
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations");

      // Fallback to example recommendations
      setRecommendations(getExampleRecommendations(student));
      setHasGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const parseRecommendations = (message: string): CollegeRecommendation[] => {
    try {
      // Try to extract JSON from the message
      const jsonMatch = message.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse recommendations:", e);
    }

    // Fallback to example data
    return getExampleRecommendations(student);
  };

  const getExampleRecommendations = (student: Student): CollegeRecommendation[] => {
    const gpa = student.gpa_unweighted || 3.5;
    const sat = student.sat_score || 1200;

    if (gpa >= 3.8 && sat >= 1400) {
      return [
        { name: "MIT", type: "reach", location: "Cambridge, MA", reason: "Strong STEM programs matching academic profile" },
        { name: "Stanford University", type: "reach", location: "Stanford, CA", reason: "Excellent fit for high achievers" },
        { name: "UCLA", type: "match", location: "Los Angeles, CA", reason: "Great balance of academics and campus life" },
        { name: "UC Berkeley", type: "match", location: "Berkeley, CA", reason: "Top public university with diverse programs" },
        { name: "UC San Diego", type: "safety", location: "San Diego, CA", reason: "Strong programs with good acceptance rate" },
        { name: "UC Irvine", type: "safety", location: "Irvine, CA", reason: "Excellent safety option with growing reputation" },
      ];
    } else if (gpa >= 3.5 && sat >= 1200) {
      return [
        { name: "UCLA", type: "reach", location: "Los Angeles, CA", reason: "Competitive but achievable with strong application" },
        { name: "UC Berkeley", type: "reach", location: "Berkeley, CA", reason: "Worth applying with compelling essays" },
        { name: "UC Davis", type: "match", location: "Davis, CA", reason: "Good fit for academic profile" },
        { name: "UC Santa Barbara", type: "match", location: "Santa Barbara, CA", reason: "Beautiful campus with solid programs" },
        { name: "UC Riverside", type: "safety", location: "Riverside, CA", reason: "Growing campus with good opportunities" },
        { name: "San Diego State", type: "safety", location: "San Diego, CA", reason: "Strong programs with higher acceptance rate" },
      ];
    } else {
      return [
        { name: "UC Santa Cruz", type: "reach", location: "Santa Cruz, CA", reason: "Unique programs worth exploring" },
        { name: "UC Riverside", type: "reach", location: "Riverside, CA", reason: "Growing reputation and opportunities" },
        { name: "Cal State Long Beach", type: "match", location: "Long Beach, CA", reason: "Good programs with reasonable requirements" },
        { name: "San Francisco State", type: "match", location: "San Francisco, CA", reason: "Urban campus with diverse offerings" },
        { name: "Cal State Fullerton", type: "safety", location: "Fullerton, CA", reason: "Solid option with good student support" },
        { name: "Cal State Northridge", type: "safety", location: "Northridge, CA", reason: "Accessible option with variety of programs" },
      ];
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reach": return "text-purple-600 bg-purple-50";
      case "match": return "text-blue-600 bg-blue-50";
      case "safety": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reach": return <Target className="h-4 w-4" />;
      case "match": return <TrendingUp className="h-4 w-4" />;
      case "safety": return <GraduationCap className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI College Recommendations
          </CardTitle>
          {!hasGenerated && (
            <Button
              onClick={generateRecommendations}
              disabled={loading}
              size="sm"
            >
              {loading ? "Generating..." : "Generate Recommendations"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasGenerated && !loading && (
          <div className="text-center py-8">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-text-secondary">
              Get personalized college recommendations based on {student.first_name}&apos;s profile
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {hasGenerated && recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((college, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-text-primary">{college.name}</h4>
                    <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {college.location}
                    </p>
                  </div>
                  <Badge variant="outline" className={getTypeColor(college.type)}>
                    <span className="flex items-center gap-1">
                      {getTypeIcon(college.type)}
                      {college.type.charAt(0).toUpperCase() + college.type.slice(1)}
                    </span>
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">{college.reason}</p>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={generateRecommendations}
                variant="outline"
                className="w-full"
              >
                Regenerate Recommendations
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}