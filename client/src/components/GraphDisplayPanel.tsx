import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GraphDisplayPanelProps {
  graphs: string[];
  className?: string;
}

export const GraphDisplayPanel: React.FC<GraphDisplayPanelProps> = ({ graphs, className }) => {
  if (graphs.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold">Mathematical Visualizations</h3>
      {graphs.map((svgContent, index) => (
        <Card key={index} className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Graph {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div 
              className="flex justify-center bg-gray-50 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};