
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DetectorGaugeProps {
  value: number;
  max: number;
}

const DetectorGauge: React.FC<DetectorGaugeProps> = ({ value, max }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 300;
    const height = 200;
    const radius = Math.min(width, height) * 0.8;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height - 20})`);

    const arcScale = d3.scaleLinear()
      .domain([0, max])
      .range([-Math.PI / 2, Math.PI / 2]);

    // Background arc
    const backgroundArc = d3.arc<any>()
      .innerRadius(radius - 20)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append("path")
      .attr("d", backgroundArc as any)
      .attr("fill", "#1f2937");

    // Color gradient for the arc
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "gauge-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4");
    gradient.append("stop").attr("offset", "50%").attr("stop-color", "#eab308");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444");

    // Value arc
    const valueArc = d3.arc<any>()
      .innerRadius(radius - 20)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(arcScale(Math.min(value, max)));

    g.append("path")
      .attr("d", valueArc as any)
      .attr("fill", "url(#gauge-gradient)");

    // Needle
    const needleLength = radius - 30;
    const angle = arcScale(Math.min(value, max));
    
    g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", Math.sin(angle) * needleLength)
      .attr("y2", -Math.cos(angle) * needleLength)
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round");

    g.append("circle")
      .attr("r", 8)
      .attr("fill", "#374151")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Labels
    g.append("text")
      .attr("y", -radius - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("class", "text-xs font-mono")
      .text("MAGNETIC FLUX (μT)");

  }, [value, max]);

  return (
    <div className="flex justify-center items-center w-full">
      <svg ref={svgRef} width="300" height="200"></svg>
    </div>
  );
};

export default DetectorGauge;
