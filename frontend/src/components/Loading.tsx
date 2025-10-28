import React from "react";

/**
 * A simple, dumb loading spinner component.
 * It is only responsible for displaying the animation.
 * All navigation/auth logic is handled by parent components (e.g., App.tsx, RequireAuth).
 */
const Loading: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="animate-spin rounded-full h-14 w-14 border-2 border-t-primary" />
    </div>
  );
};

export default Loading;
