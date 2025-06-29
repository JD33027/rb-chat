import React from 'react';

const QuotedMessage = ({ message, currentUserId }) => {
  if (!message) return null;

  const isReplyToSelf = message.sender.id === currentUserId;
  const senderName = isReplyToSelf ? 'You' : message.sender.username || `${message.sender.countryCode} ${message.sender.phoneNumber}`;

  return (
    <div className="p-2 mb-1 text-sm bg-black bg-opacity-10 rounded-lg">
      <p className="font-semibold text-emerald-300">{senderName}</p>
      <p className="opacity-80 truncate">{message.content}</p>
    </div>
  );
};

export default QuotedMessage;

