// src/components/common/Title.tsx
import React from "react";

type TitleProps = {
  text1: string;
  text2: string;
};

const Title: React.FC<TitleProps> = ({ text1, text2 }) => {
  return (
    <h1 className="text-2xl font-medium">
      {text1} <span className="text-primary underline">{text2}</span>
    </h1>
  );
};

export default Title;
