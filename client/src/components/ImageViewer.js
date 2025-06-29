import React from 'react';

const ImageViewer = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 animate-fade-in"
      onClick={onClose}
    >
      <div className="relative p-4">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 p-1 text-white bg-gray-800 rounded-full hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={imageUrl}
          alt="Full screen view"
          className="max-h-[90vh] max-w-[90vw] object-contain"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image itself
        />
      </div>
    </div>
  );
};

export default ImageViewer;

