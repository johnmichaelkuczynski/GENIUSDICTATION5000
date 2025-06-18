/**
 * Service for generating mathematical graphs and visualizations based on text content
 */

interface GraphPoint {
  x: number;
  y: number;
}

interface GraphConfig {
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  title: string;
  xLabel: string;
  yLabel: string;
}

/**
 * Generate an SVG graph for viral infection spread over time
 */
export function generateViralSpreadGraph(): string {
  const config: GraphConfig = {
    width: 600,
    height: 400,
    xMin: 0,
    xMax: 100,
    yMin: 0,
    yMax: 100,
    title: "Viral Infection Spread in Closed Population",
    xLabel: "Time (days)",
    yLabel: "Infected Population (%)"
  };

  // Generate realistic epidemic curve data
  const points: GraphPoint[] = [];
  for (let t = 0; t <= 100; t += 2) {
    let infected: number;
    
    // Simple epidemic curve with clear phases
    if (t <= 10) {
      // Initial slow spread (exponential start)
      infected = 0.5 * Math.exp(0.1 * t);
    } else if (t <= 30) {
      // Rapid growth phase
      infected = 2 + 25 * (1 - Math.exp(-0.15 * (t - 10)));
    } else if (t <= 50) {
      // Peak and plateau
      infected = 25 + 20 * Math.exp(-0.1 * (t - 30)) + 3 * Math.sin(0.3 * (t - 30));
    } else if (t <= 70) {
      // Second wave
      infected = 20 + 15 * Math.exp(-0.05 * (t - 50)) * (1 + 0.8 * Math.sin(0.2 * (t - 50)));
    } else {
      // Decline and stabilization
      infected = 15 * Math.exp(-0.08 * (t - 70)) + 2;
    }
    
    // Ensure values are within bounds and add some realistic noise
    infected = Math.max(0, Math.min(80, infected + (Math.random() - 0.5) * 2));
    points.push({ x: t, y: infected });
  }

  return generateSVGGraph(points, config);
}

/**
 * Generate an SVG graph for population dynamics
 */
export function generatePopulationDynamicsGraph(): string {
  const config: GraphConfig = {
    width: 600,
    height: 400,
    xMin: 0,
    xMax: 50,
    yMin: 0,
    yMax: 1000,
    title: "Population Dynamics Over Time",
    xLabel: "Time (years)",
    yLabel: "Population Size"
  };

  const points: GraphPoint[] = [];
  for (let t = 0; t <= 50; t += 0.5) {
    // Logistic growth with carrying capacity
    const carryingCapacity = 800;
    const growthRate = 0.1;
    const initialPop = 50;
    
    const population = carryingCapacity / (1 + ((carryingCapacity - initialPop) / initialPop) * Math.exp(-growthRate * t));
    points.push({ x: t, y: population });
  }

  return generateSVGGraph(points, config);
}

/**
 * Generate a mathematical function graph based on equation
 */
export function generateMathFunctionGraph(equation: string, title: string): string {
  const config: GraphConfig = {
    width: 600,
    height: 400,
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    title: title || `Graph of ${equation}`,
    xLabel: "x",
    yLabel: "y"
  };

  const points: GraphPoint[] = [];
  
  try {
    for (let x = config.xMin; x <= config.xMax; x += 0.1) {
      const y = evaluateExpression(equation, x);
      if (isFinite(y) && y >= config.yMin && y <= config.yMax) {
        points.push({ x, y });
      }
    }
  } catch (error) {
    console.error('Error generating function graph:', error);
    return generateErrorGraph(equation);
  }

  return generateSVGGraph(points, config);
}

/**
 * Safe mathematical expression evaluation
 */
function evaluateExpression(expr: string, x: number): number {
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

    // Fix unary operator precedence issues with exponentiation
    cleanExpr = cleanExpr.replace(/-(\d+(?:\.\d+)?)\*\*/g, '(($1) * -1)**');
    cleanExpr = cleanExpr.replace(/Math\.(\w+)\(-(\d+(?:\.\d+)?)\*\*/g, 'Math.$1((($2) * -1)**');

    // Use Function constructor for safe evaluation
    const result = new Function('return ' + cleanExpr)();
    return isFinite(result) ? result : 0;
  } catch (error) {
    console.error('Error evaluating expression:', expr, error);
    return 0;
  }
}

/**
 * Generate SVG graph from points and configuration
 */
function generateSVGGraph(points: GraphPoint[], config: GraphConfig): string {
  const padding = 60;
  const graphWidth = config.width - 2 * padding;
  const graphHeight = config.height - 2 * padding;

  // Convert data points to SVG coordinates
  const svgPoints = points.map(point => ({
    x: padding + ((point.x - config.xMin) / (config.xMax - config.xMin)) * graphWidth,
    y: config.height - padding - ((point.y - config.yMin) / (config.yMax - config.yMin)) * graphHeight
  }));

  // Generate path string - ensure coordinates are valid numbers
  const pathData = svgPoints.length > 0 
    ? `M ${svgPoints[0].x.toFixed(2)} ${svgPoints[0].y.toFixed(2)} ` + 
      svgPoints.slice(1).map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    : '';

  console.log(`Generated SVG path with ${svgPoints.length} points`);
  console.log(`Path data: ${pathData.substring(0, 100)}...`);

  // Generate grid lines
  const gridLines: string[] = [];
  
  // Vertical grid lines
  for (let x = Math.ceil(config.xMin); x <= config.xMax; x++) {
    const svgX = padding + ((x - config.xMin) / (config.xMax - config.xMin)) * graphWidth;
    gridLines.push(`<line x1="${svgX}" y1="${padding}" x2="${svgX}" y2="${config.height - padding}" stroke="#e5e7eb" stroke-width="1"/>`);
  }
  
  // Horizontal grid lines
  for (let y = Math.ceil(config.yMin); y <= config.yMax; y += (config.yMax - config.yMin) / 10) {
    const svgY = config.height - padding - ((y - config.yMin) / (config.yMax - config.yMin)) * graphHeight;
    gridLines.push(`<line x1="${padding}" y1="${svgY}" x2="${config.width - padding}" y2="${svgY}" stroke="#e5e7eb" stroke-width="1"/>`);
  }

  // Generate axis labels
  const xAxisLabels: string[] = [];
  const yAxisLabels: string[] = [];
  
  for (let x = Math.ceil(config.xMin); x <= config.xMax; x += Math.max(1, Math.round((config.xMax - config.xMin) / 10))) {
    const svgX = padding + ((x - config.xMin) / (config.xMax - config.xMin)) * graphWidth;
    xAxisLabels.push(`<text x="${svgX}" y="${config.height - padding + 20}" text-anchor="middle" font-size="12" fill="#6b7280">${x}</text>`);
  }
  
  for (let y = Math.ceil(config.yMin); y <= config.yMax; y += Math.max(1, Math.round((config.yMax - config.yMin) / 8))) {
    const svgY = config.height - padding - ((y - config.yMin) / (config.yMax - config.yMin)) * graphHeight;
    yAxisLabels.push(`<text x="${padding - 10}" y="${svgY + 4}" text-anchor="end" font-size="12" fill="#6b7280">${y}</text>`);
  }

  return `
<svg width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="100%" height="100%" fill="#ffffff" stroke="#d1d5db" stroke-width="1"/>
  
  <!-- Grid lines -->
  ${gridLines.join('\n  ')}
  
  <!-- Axes -->
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${config.height - padding}" stroke="#374151" stroke-width="2"/>
  <line x1="${padding}" y1="${config.height - padding}" x2="${config.width - padding}" y2="${config.height - padding}" stroke="#374151" stroke-width="2"/>
  
  <!-- Data curve -->
  ${pathData ? `<path d="${pathData}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
  
  <!-- Axis labels -->
  ${xAxisLabels.join('\n  ')}
  ${yAxisLabels.join('\n  ')}
  
  <!-- Axis titles -->
  <text x="${config.width / 2}" y="${config.height - 10}" text-anchor="middle" font-size="14" font-weight="bold" fill="#374151">${config.xLabel}</text>
  <text x="20" y="${config.height / 2}" text-anchor="middle" font-size="14" font-weight="bold" fill="#374151" transform="rotate(-90, 20, ${config.height / 2})">${config.yLabel}</text>
  
  <!-- Title -->
  <text x="${config.width / 2}" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#1f2937">${config.title}</text>
</svg>`;
}

/**
 * Generate an error graph when equation parsing fails
 */
function generateErrorGraph(equation: string): string {
  return `
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#fef2f2" stroke="#fca5a5" stroke-width="1"/>
  <text x="300" y="200" text-anchor="middle" font-size="16" fill="#dc2626">
    Error: Unable to graph equation "${equation}"
  </text>
  <text x="300" y="230" text-anchor="middle" font-size="14" fill="#7f1d1d">
    Please check the equation syntax
  </text>
</svg>`;
}

/**
 * Detect if text content requires a specific type of graph
 */
export function detectGraphType(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('viral') && (lowerText.includes('spread') || lowerText.includes('infection'))) {
    return 'viral-spread';
  }
  
  if (lowerText.includes('population') && lowerText.includes('dynamic')) {
    return 'population-dynamics';
  }
  
  // Look for mathematical equations
  const mathPattern = /(?:y\s*=|f\(x\)\s*=)\s*([^.]+)/i;
  const match = text.match(mathPattern);
  if (match) {
    return `function:${match[1].trim()}`;
  }
  
  return null;
}

/**
 * Generate appropriate graph based on detected content
 */
export function generateGraphForContent(text: string): string | null {
  const graphType = detectGraphType(text);
  
  if (!graphType) return null;
  
  if (graphType === 'viral-spread') {
    return generateViralSpreadGraph();
  }
  
  if (graphType === 'population-dynamics') {
    return generatePopulationDynamicsGraph();
  }
  
  if (graphType.startsWith('function:')) {
    const equation = graphType.substring(9);
    return generateMathFunctionGraph(equation, `Graph of ${equation}`);
  }
  
  return null;
}