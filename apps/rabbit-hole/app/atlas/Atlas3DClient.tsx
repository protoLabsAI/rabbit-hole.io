"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// react-force-graph-3d requires browser APIs (WebGL, canvas) — disable SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

export default function Atlas3DClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#000011]">
      <ForceGraph3D
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#000011"
        showNavInfo={false}
      />
    </div>
  );
}
