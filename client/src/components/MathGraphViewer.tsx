import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Point {
  x: number;
  y: number;
}

interface GraphSettings {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  step: number;
  gridSize: number;
}

interface MathGraphViewerProps {
  equation?: string;
  onEquationChange?: (equation: string) => void;
}

export function MathGraphViewer({ equation: initialEquation = '', onEquationChange }: MathGraphViewerProps) {
  const [equation, setEquation] = useState(initialEquation);
  const [graphType, setGraphType] = useState<'function' | 'parametric' | 'polar'>('function');
  const [settings, setSettings] = useState<GraphSettings>({
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    step: 0.1,
    gridSize: 1
  });
  const [error, setError] = useState<string | null>(null);

  // SVG dimensions
  const SVG_WIDTH = 600;
  const SVG_HEIGHT = 400;
  const PADDING = 40;

  // Convert mathematical coordinates to SVG coordinates
  const mathToSvg = useCallback((mathX: number, mathY: number): Point => {
    const svgX = PADDING + ((mathX - settings.xMin) / (settings.xMax - settings.xMin)) * (SVG_WIDTH - 2 * PADDING);
    const svgY = SVG_HEIGHT - PADDING - ((mathY - settings.yMin) / (settings.yMax - settings.yMin)) * (SVG_HEIGHT - 2 * PADDING);
    return { x: svgX, y: svgY };
  }, [settings]);

  // Safe math evaluation function
  const evaluateExpression = useCallback((expr: string, x: number, t?: number): number => {
    try {
      // Replace common math functions and constants
      let cleanExpr = expr
        .replace(/\^/g, '**')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/log/g, 'Math.log10')
        .replace(/ln/g, 'Math.log')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/abs/g, 'Math.abs')
        .replace(/pi/g, 'Math.PI')
        .replace(/e(?![a-zA-Z])/g, 'Math.E')
        .replace(/x/g, x.toString());

      if (t !== undefined) {
        cleanExpr = cleanExpr.replace(/t/g, t.toString());
      }

      // Use Function constructor for safe evaluation
      return new Function('return ' + cleanExpr)();
    } catch (e) {
      throw new Error(`Invalid expression: ${expr}`);
    }
  }, []);

  // Generate points for the graph
  const graphPoints = useMemo(() => {
    if (!equation.trim()) return [];
    
    setError(null);
    const points: Point[] = [];

    try {
      if (graphType === 'function') {
        // y = f(x) format
        for (let x = settings.xMin; x <= settings.xMax; x += settings.step) {
          try {
            const y = evaluateExpression(equation, x);
            if (isFinite(y) && y >= settings.yMin && y <= settings.yMax) {
              points.push(mathToSvg(x, y));
            }
          } catch (e) {
            // Skip invalid points
            continue;
          }
        }
      } else if (graphType === 'parametric') {
        // x = f(t), y = g(t) format - expect "x_expr,y_expr"
        const [xExpr, yExpr] = equation.split(',').map(e => e.trim());
        if (!xExpr || !yExpr) {
          throw new Error('Parametric equations must be in format: x_expression,y_expression');
        }

        for (let t = settings.xMin; t <= settings.xMax; t += settings.step) {
          try {
            const x = evaluateExpression(xExpr, 0, t);
            const y = evaluateExpression(yExpr, 0, t);
            if (isFinite(x) && isFinite(y) && 
                x >= settings.xMin && x <= settings.xMax && 
                y >= settings.yMin && y <= settings.yMax) {
              points.push(mathToSvg(x, y));
            }
          } catch (e) {
            continue;
          }
        }
      } else if (graphType === 'polar') {
        // r = f(θ) format
        for (let theta = 0; theta <= 2 * Math.PI; theta += settings.step / 10) {
          try {
            const r = evaluateExpression(equation, theta);
            if (isFinite(r) && r >= 0) {
              const x = r * Math.cos(theta);
              const y = r * Math.sin(theta);
              if (x >= settings.xMin && x <= settings.xMax && 
                  y >= settings.yMin && y <= settings.yMax) {
                points.push(mathToSvg(x, y));
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error occurred');
      return [];
    }

    return points;
  }, [equation, graphType, settings, mathToSvg, evaluateExpression]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    
    // Vertical grid lines
    for (let x = Math.ceil(settings.xMin / settings.gridSize) * settings.gridSize; 
         x <= settings.xMax; 
         x += settings.gridSize) {
      const svgPoint = mathToSvg(x, 0);
      lines.push(
        <line
          key={`v-${x}`}
          x1={svgPoint.x}
          y1={PADDING}
          x2={svgPoint.x}
          y2={SVG_HEIGHT - PADDING}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      );
    }

    // Horizontal grid lines
    for (let y = Math.ceil(settings.yMin / settings.gridSize) * settings.gridSize; 
         y <= settings.yMax; 
         y += settings.gridSize) {
      const svgPoint = mathToSvg(0, y);
      lines.push(
        <line
          key={`h-${y}`}
          x1={PADDING}
          y1={svgPoint.y}
          x2={SVG_WIDTH - PADDING}
          y2={svgPoint.y}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      );
    }

    return lines;
  }, [settings, mathToSvg]);

  // Generate axes
  const axes = useMemo(() => {
    const xAxisY = mathToSvg(0, 0).y;
    const yAxisX = mathToSvg(0, 0).x;
    
    return (
      <>
        {/* X-axis */}
        <line
          x1={PADDING}
          y1={xAxisY}
          x2={SVG_WIDTH - PADDING}
          y2={xAxisY}
          stroke="#374151"
          strokeWidth="2"
        />
        {/* Y-axis */}
        <line
          x1={yAxisX}
          y1={PADDING}
          x2={yAxisX}
          y2={SVG_HEIGHT - PADDING}
          stroke="#374151"
          strokeWidth="2"
        />
      </>
    );
  }, [mathToSvg]);

  // Generate path string for the curve
  const pathString = useMemo(() => {
    if (graphPoints.length === 0) return '';
    
    let path = `M ${graphPoints[0].x} ${graphPoints[0].y}`;
    for (let i = 1; i < graphPoints.length; i++) {
      path += ` L ${graphPoints[i].x} ${graphPoints[i].y}`;
    }
    return path;
  }, [graphPoints]);

  const handleEquationChange = (newEquation: string) => {
    setEquation(newEquation);
    onEquationChange?.(newEquation);
  };

  const handleDownloadSVG = () => {
    const svgElement = document.getElementById('math-graph-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = 'math-graph.svg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const resetSettings = () => {
    setSettings({
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
      step: 0.1,
      gridSize: 1
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Math Graph Visualizer
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSVG}
            disabled={!pathString}
          >
            <Download className="h-4 w-4" />
            Export SVG
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="equation">Equation</Label>
            <Input
              id="equation"
              value={equation}
              onChange={(e) => handleEquationChange(e.target.value)}
              placeholder="e.g., x^2, sin(x), cos(x)+2"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="graph-type">Graph Type</Label>
            <Select value={graphType} onValueChange={(value: any) => setGraphType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="function">Function y = f(x)</SelectItem>
                <SelectItem value="parametric">Parametric x,y = f(t)</SelectItem>
                <SelectItem value="polar">Polar r = f(θ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quick Settings</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset View
            </Button>
          </div>
        </div>

        {/* Range Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <div className="space-y-1">
            <Label htmlFor="x-min">X Min</Label>
            <Input
              id="x-min"
              type="number"
              value={settings.xMin}
              onChange={(e) => setSettings(prev => ({ ...prev, xMin: parseFloat(e.target.value) || -10 }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="x-max">X Max</Label>
            <Input
              id="x-max"
              type="number"
              value={settings.xMax}
              onChange={(e) => setSettings(prev => ({ ...prev, xMax: parseFloat(e.target.value) || 10 }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="y-min">Y Min</Label>
            <Input
              id="y-min"
              type="number"
              value={settings.yMin}
              onChange={(e) => setSettings(prev => ({ ...prev, yMin: parseFloat(e.target.value) || -10 }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="y-max">Y Max</Label>
            <Input
              id="y-max"
              type="number"
              value={settings.yMax}
              onChange={(e) => setSettings(prev => ({ ...prev, yMax: parseFloat(e.target.value) || 10 }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="step">Step</Label>
            <Input
              id="step"
              type="number"
              step="0.01"
              value={settings.step}
              onChange={(e) => setSettings(prev => ({ ...prev, step: parseFloat(e.target.value) || 0.1 }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="grid">Grid</Label>
            <Input
              id="grid"
              type="number"
              value={settings.gridSize}
              onChange={(e) => setSettings(prev => ({ ...prev, gridSize: parseFloat(e.target.value) || 1 }))}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Graph Display */}
        <div className="w-full bg-white border rounded-lg p-4 overflow-x-auto">
          <svg
            id="math-graph-svg"
            width={SVG_WIDTH}
            height={SVG_HEIGHT}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="mx-auto"
          >
            {/* Grid */}
            {gridLines}
            
            {/* Axes */}
            {axes}
            
            {/* Function curve */}
            {pathString && (
              <path
                d={pathString}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            
            {/* Axis labels */}
            <text x={SVG_WIDTH - 20} y={mathToSvg(0, 0).y - 5} textAnchor="middle" fontSize="12" fill="#6b7280">
              x
            </text>
            <text x={mathToSvg(0, 0).x + 10} y={20} textAnchor="middle" fontSize="12" fill="#6b7280">
              y
            </text>
          </svg>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Function examples:</strong> x^2, sin(x), cos(x)*2, sqrt(x), log(x)</p>
          <p><strong>Parametric examples:</strong> t*cos(t), t*sin(t) (separate x and y with comma)</p>
          <p><strong>Polar examples:</strong> 1+cos(x), sin(2*x)</p>
          <p><strong>Available functions:</strong> sin, cos, tan, sqrt, log, ln, abs, pi, e</p>
        </div>
      </CardContent>
    </Card>
  );
}