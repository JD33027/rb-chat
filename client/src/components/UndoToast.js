import React, { useEffect } from 'react';

const UndoToast = ({ message, onUndo, onTimeout }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onTimeout();
    }, 5000); // 5-second timeout

    return () => clearTimeout(timer);
  }, [onTimeout]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-800 text-white rounded-full shadow-lg flex items-center space-x-4 animate-fade-in-up">
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="font-semibold uppercase text-emerald-400 hover:text-emerald-300"
      >
        Undo
      </button>
    </div>
  );
};

export default UndoToast;

