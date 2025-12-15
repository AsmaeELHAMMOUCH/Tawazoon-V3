"use client";
import { useEffect, useRef } from "react";

export default function useEchartAutoResize() {
  const ref = useRef(null);
  useEffect(() => {
    const chart = ref.current?.getEchartsInstance?.();
    if (!chart) return;
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return ref;
}
