import React from 'react';

// Icons for the action bar
const ReplyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>;

const ChatActionBar = ({ selectedCount, onCancel, onReply, onDelete, onForward }) => {
  return (
    <div className="flex items-center justify-between w-full p-2 bg-emerald-600 text-white shadow-md">
      <div className="flex items-center">
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-emerald-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <span className="ml-4 text-lg font-semibold">{selectedCount} Selected</span>
      </div>
      <div className="flex items-center space-x-2">
        {selectedCount === 1 && (
          <button onClick={onReply} className="p-2 rounded-full hover:bg-emerald-700">
            <ReplyIcon />
          </button>
        )}
        <button onClick={onForward} className="p-2 rounded-full hover:bg-emerald-700">
          <ForwardIcon />
        </button>
        <button onClick={onDelete} className="p-2 rounded-full hover:bg-emerald-700">
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
};

export default ChatActionBar;