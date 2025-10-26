
import React from 'react';

interface Gate {
  type: string;
  inputs: string[];
  output: string;
}

interface TruthTableRow {
  [key: string]: number | string;
}

interface CircuitData {
  inputs: string[];
  outputs: string[];
  boolean_expression: string;
  gates: Gate[];
  truth_table: TruthTableRow[];
  explanation: string;
}

interface LogicCircuitRendererProps {
  data: CircuitData | null;
}

const LogicCircuitRenderer: React.FC<LogicCircuitRendererProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg shadow-sm">
        <p className="text-lg text-muted-foreground">No circuit data yet. Generate a circuit to see the diagram.</p>
      </div>
    );
  }

  const gateWidth = 80;
  const gateHeight = 40;
  const hSpacing = 100;
  const vSpacing = 60;
  const margin = 20;

  const gatePositions: { [key: string]: { x: number; y: number } } = {};

  // Calculate positions for gates. Simple horizontal layout for now.
  data.gates.forEach((gate, index) => {
    gatePositions[gate.output] = {
      x: index * hSpacing + margin,
      y: margin,
    };
  });

  const svgWidth = data.gates.length * hSpacing + 2 * margin;
  const svgHeight = gateHeight + 2 * margin + vSpacing * 2; // Enough space for inputs/outputs

  return (
    <div className="container mx-auto p-4 bg-card rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold text-center mb-4 text-foreground border-b pb-2">Logic Circuit Diagram</h2>
      <div className="overflow-x-auto mb-6 pb-2">
        <svg width={svgWidth} height={svgHeight} className="border border-border bg-background rounded-md block mx-auto">
          {/* Render gates */}
          {data.gates.map((gate, index) => {
            const pos = gatePositions[gate.output];
            return (
              <g key={index}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={gateWidth}
                  height={gateHeight}
                  rx={10} // Rounded corners
                  ry={10}
                  className="fill-blue-100 stroke-blue-500 stroke-2"
                />
                <text
                  x={pos.x + gateWidth / 2}
                  y={pos.y + gateHeight / 2}
                  className="text-base font-bold fill-blue-800"
                  dominantBaseline="middle"
                  textAnchor="middle"
                >
                  {gate.type}
                </text>
              </g>
            );
          })}

          {/* Render lines (simplified for now, direct connections to gate inputs/outputs) */}
          {data.gates.map((gate, index) => {
            const pos = gatePositions[gate.output];
            // Input lines
            gate.inputs.forEach((input, i) => {
              // This is a very simplified line drawing. In a real scenario, you'd need a more sophisticated layout algorithm.
              // For demonstration, drawing from a fixed point to the gate input.
              const startX = pos.x - 30;
              const startY = pos.y + (gateHeight / (gate.inputs.length + 1)) * (i + 1);
              const endX = pos.x;
              const endY = startY;
              return (
                <React.Fragment key={`${gate.output}-input-${input}-${i}`}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY} className="stroke-gray-700 stroke-2 fill-none" />
                  <text x={startX - 10} y={startY + 5} className="text-xs fill-gray-600">{input}</text>
                </React.Fragment>
              );
            });

            // Output line
            const outputStartX = pos.x + gateWidth;
            const outputStartY = pos.y + gateHeight / 2;
            const outputEndX = outputStartX + 30;
            const outputEndY = outputStartY;
            return (
              <React.Fragment key={`${gate.output}-output`}>
                <line x1={outputStartX} y1={outputStartY} x2={outputEndX} y2={outputEndY} className="stroke-gray-700 stroke-2 fill-none" />
                <text x={outputEndX + 5} y={outputEndY + 5} className="text-xs fill-gray-600">{gate.output}</text>
              </React.Fragment>
            );
          })}
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-center mb-4 text-foreground border-b pb-2">Boolean Expression</h2>
      <p className="text-lg font-bold text-gray-700 mb-6">{data.boolean_expression}</p>

      <h2 className="text-2xl font-bold text-center mb-4 text-foreground border-b pb-2">Truth Table</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse mx-auto bg-background">
          <thead>
            <tr>
              {Object.keys(data.truth_table[0]).map((key) => (
                <th key={key} className="border border-border p-3 bg-secondary font-bold text-foreground">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.truth_table.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {Object.values(row).map((value, colIndex) => (
                  <td key={colIndex} className="border border-border p-3 text-center text-muted-foreground">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-center mb-4 text-foreground border-b pb-2">Explanation</h2>
      <p className="text-base leading-relaxed text-muted-foreground mb-6 text-left px-2">{data.explanation}</p>
    </div>
  );
};


export default LogicCircuitRenderer;

