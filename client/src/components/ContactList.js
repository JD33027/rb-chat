import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';
import ProfileMenu from './ProfileMenu';
import MessageStatus from './MessageStatus';

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const ContactList = ({ contacts, onSelectContact, selectedContactId, onlineUsers, currentUserId }) => {
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Effect to handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);
  
  const filteredContacts = contacts.filter(
    (contact) => {
      const displayName = contact.username || `${contact.countryCode}${contact.phoneNumber}`;
      return displayName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 bg-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">RB-CHAT</h2>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-500 rounded-full hover:bg-slate-200">
              {/* Three-dot menu icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {isMenuOpen && <ProfileMenu onLogout={logout} onClose={() => setIsMenuOpen(false)} />}
          </div>
        </div>
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
      </div>

      {/* Contact List */}
      <ul className="flex-1 overflow-y-auto divide-y divide-gray-200">
        {filteredContacts.map((contact) => (
          <li
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className={`flex items-center p-4 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-slate-100 ${selectedContactId === contact.id ? 'bg-emerald-50' : ''}`}
          >
            <div className="relative mr-4">
              {contact.profilePictureUrl ? (
                <img src={`${API_BASE_URL}${contact.profilePictureUrl}`} alt={contact.username || 'Profile'} className="object-cover w-12 h-12 rounded-full" />
              ) : (
                <div className="flex items-center justify-center w-12 h-12 text-xl font-bold text-white rounded-full bg-emerald-500">
                  {(contact.username || contact.phoneNumber).charAt(0).toUpperCase()}
                </div>
              )}
              {onlineUsers.has(contact.id) && (
                <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>

            <div className="flex-1 min-w-0 mr-2">
              <p className="font-semibold text-slate-800">{contact.username || `${contact.countryCode} ${contact.phoneNumber}`}</p>
              <div className="flex items-center text-sm text-gray-500">
                {contact.lastMessage && contact.lastMessage.senderId === currentUserId && (
                  <div className="mr-1">
                    <MessageStatus status={contact.lastMessage.status} location="contactList" />
                  </div>
                )}
                <p className="truncate">
                  {contact.lastMessage
                    ? contact.lastMessage.type === 'IMAGE'
                      ? '📷 Photo' :
                      contact.lastMessage.type === 'AUDIO'
                      ? '🎤 Voice note'
                      : contact.lastMessage.content
                    : 'Click to start chatting...'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end ml-2">
              <p className={`text-xs whitespace-nowrap ${contact.unreadCount > 0 ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                {contact.lastMessage ? formatTimestamp(contact.lastMessage.createdAt) : ''}
              </p>
              {contact.unreadCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 min-w-5 mt-1 text-xs font-bold text-white bg-emerald-600 rounded-full">
                  {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContactList;
