import React from 'react';

const ConfirmationModal = ({ title, message, options, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        <div className="mt-6 space-y-2">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className={`w-full px-4 py-2 text-sm font-medium text-center rounded-md transition-colors ${option.style}`}
            >
              {option.text}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <button onClick={onCancel} className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

