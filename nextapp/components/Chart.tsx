"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface ChartProps {
  option: any;
  onClick?: (params: any) => void;
  className?: string;
}

export default function Chart({ option, onClick, className }: ChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const onClickRef = useRef<typeof onClick>(onClick);
  onClickRef.current = onClick;

  // init once
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    chart.on("click", (params: any) => {
      if (onClickRef.current) onClickRef.current(params);
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // update option whenever it changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);

  return <div ref={ref} className={className} />;
}
