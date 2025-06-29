import React, { useState } from 'react';

const ImagePreviewModal = ({ file, onCancel, onSend }) => {
  const [caption, setCaption] = useState('');
  const [previewUrl] = useState(URL.createObjectURL(file));

  const handleSend = () => {
    onSend(caption);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-full max-w-lg p-4 bg-gray-800 rounded-lg shadow-xl flex flex-col">
        <div className="flex-1 mb-4 flex items-center justify-center">
          <img src={previewUrl} alt="Preview" className="max-h-[60vh] max-w-full object-contain" />
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="flex-1 px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={handleSend} className="p-3 font-semibold text-white transition-transform duration-200 bg-emerald-500 rounded-full hover:bg-emerald-600 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
        <button onClick={onCancel} className="absolute top-2 right-2 p-2 text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-75">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

export default ImagePreviewModal;

