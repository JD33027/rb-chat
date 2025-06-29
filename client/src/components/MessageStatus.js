import React from 'react';

const MessageStatus = ({ status, location = 'chatWindow' }) => {
  if (!status) {
    return null;
  }

  const isSeen = status === 'SEEN';
  const color = isSeen ? 'text-blue-500' : location === 'chatWindow' ? 'text-gray-50' : 'text-gray-500';
  const size = location === 'chatWindow' ? 'text-sm' : 'text-xs';

  if (status === 'SENT') {
    const sentColor = location === 'chatWindow' ? 'text-gray-50' : 'text-gray-500';
    return <span className={`${size} ${sentColor} font-semibold`}>✓</span>;
  }

  if (status === 'DELIVERED' || status === 'SEEN') {
    return <span className={`${size} font-semibold ${color}`}>✓✓</span>;
  }

  return null;
};

export default MessageStatus;
