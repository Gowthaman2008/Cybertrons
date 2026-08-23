"use client";

interface CategoryScores {
  paymentRequestRisk: number;
  urgencyLanguage: number;
  domainLegitimacy: number;
  languageQuality: number;
  offerRealism: number;
}

interface Props {
  scores: CategoryScores;
  riskVerdict: string;
}

export default function RadarChart({ scores, riskVerdict }: Props) {
  // Axes definitions
  const axes = [
    { label: "Payment Request", key: "paymentRequestRisk" as const },
    { label: "Urgency Pressure", key: "urgencyLanguage" as const },
    { label: "Domain Legitimacy", key: "domainLegitimacy" as const },
    { label: "Language Quality", key: "languageQuality" as const },
    { label: "Offer Realism", key: "offerRealism" as const }
  ];

  const cx = 150;
  const cy = 135;
  const r = 80;
  const numSides = 5;

  // Color theme mapping
  const strokeColor =
    riskVerdict === "High Risk"
      ? "#E0503A"
      : riskVerdict === "Medium Risk"
      ? "#E0A430"
      : "#3FB27F";

  const fillColor =
    riskVerdict === "High Risk"
      ? "rgba(224, 80, 58, 0.25)"
      : riskVerdict === "Medium Risk"
      ? "rgba(224, 164, 48, 0.25)"
      : "rgba(63, 178, 127, 0.25)";

  // Compute vertex coordinates
  const getCoordinates = (index: number, radius: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / numSides;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  };

  // Generate background concentric grid polygons
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPolygons = gridLevels.map((level) => {
    const points = [];
    for (let i = 0; i < numSides; i++) {
      const { x, y } = getCoordinates(i, r * level);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  });

  // Generate data polygon points
  const dataPoints = axes
    .map((axis, i) => {
      const val = scores[axis.key];
      const levelRadius = r * (val / 100);
      const { x, y } = getCoordinates(i, levelRadius);
      return `${x},${y}`;
    })
    .join(" ");

  // Text label adjustments (to avoid cutting off on edges)
  const getLabelAnchor = (index: number) => {
    if (index === 0) return "middle";
    if (index === 1 || index === 2) return "start";
    return "end";
  };

  const getLabelOffset = (index: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / numSides;
    return {
      dx: 12 * Math.cos(angle),
      dy: 10 * Math.sin(angle) + 4
    };
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-base-bg rounded border border-base-border w-full max-w-[340px] mx-auto select-none">
      <h4 className="text-[10px] font-mono uppercase text-ink-faint tracking-wider mb-2">
        Forensic Category Breakdown
      </h4>

      <svg width="300" height="255" className="overflow-visible">
        {/* Concentric Grids */}
        {gridPolygons.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill="none"
            stroke="#DDE1E5"
            strokeWidth="0.8"
            strokeDasharray={idx < 3 ? "2,2" : undefined}
          />
        ))}

        {/* Radial Axis Lines */}
        {axes.map((_, i) => {
          const { x, y } = getCoordinates(i, r);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#DDE1E5"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Data Area Polygon */}
        {dataPoints && (
          <polygon
            points={dataPoints}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            className="animate-fade-in"
          />
        )}

        {/* Vertex Dots */}
        {axes.map((axis, i) => {
          const val = scores[axis.key];
          const { x, y } = getCoordinates(i, r * (val / 100));
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill={strokeColor}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Labels */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(i, r);
          const { dx, dy } = getLabelOffset(i);
          const anchor = getLabelAnchor(i);
          const score = scores[axis.key];

          return (
            <text
              key={i}
              x={x + dx}
              y={y + dy}
              fill="#475569"
              fontSize="10"
              fontFamily="monospace"
              textAnchor={anchor}
              className="font-mono"
            >
              {axis.label} ({score})
            </text>
          );
        })}
      </svg>
    </div>
  );
}
