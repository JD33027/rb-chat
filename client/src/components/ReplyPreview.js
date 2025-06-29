import React from 'react';

const ReplyPreview = ({ message, onCancel, currentUserId }) => {
  if (!message) return null;

  const isReplyToSelf = message.sender.id === currentUserId;
  const senderName = isReplyToSelf ? 'You' : message.sender.username || `${message.sender.countryCode} ${message.sender.phoneNumber}`;

  return (
    <div className="flex items-center p-2 bg-slate-200 border-b border-slate-300">
      <div className="flex-1 min-w-0 pl-2 border-l-4 border-emerald-500">
        <p className="font-semibold text-emerald-600">Replying to {senderName}</p>
        <p className="text-sm text-gray-600 truncate">{message.content}</p>
      </div>
      <button onClick={onCancel} className="p-2 ml-2 text-gray-500 rounded-full hover:bg-slate-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

export default ReplyPreview;

