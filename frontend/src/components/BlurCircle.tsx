// src/components/common/BlurCircle.tsx
import React from "react";

type BlurCircleProps = {
  top?: React.CSSProperties["top"];
  left?: React.CSSProperties["left"];
  right?: React.CSSProperties["right"];
  bottom?: React.CSSProperties["bottom"];
};

const BlurCircle: React.FC<BlurCircleProps> = ({
  top = "auto",
  left = "auto",
  right = "auto",
  bottom = "auto",
}) => {
  return (
    <div
      className="absolute -z-50 h-[14.5rem] w-[14.5rem] aspect-square rounded-full bg-primary/30 blur-3xl"
      style={{ top, left, right, bottom }}
    />
  );
};

export default BlurCircle;
