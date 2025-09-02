// src/components/common/Loading.tsx
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const Loading: React.FC = () => {
  const { nextUrl } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (nextUrl) {
      const timer = setTimeout(() => {
        navigate("/" + nextUrl);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [nextUrl, navigate]);

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="animate-spin rounded-full h-14 w-14 border-2 border-t-primary" />
    </div>
  );
};

export default Loading;
