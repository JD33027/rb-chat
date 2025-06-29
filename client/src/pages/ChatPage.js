import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import ContactList from '../components/ContactList';
import ChatWindow from '../components/ChatWindow';
import Welcome from '../components/Welcome';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const ChatPage = () => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [error, setError] = useState('');
  const socket = useSocket();
  const { token } = useAuth();

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])).userId;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }, [token]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        setContacts(response.data);
      } catch (err) {
        setError('Failed to fetch users.');
        console.error(err);
      }
    };

    fetchUsers();
  }, [selectedContact]); // Refetch when a contact is selected to clear unread counts on server

  useEffect(() => {
    if (!socket) return;

    socket.on('user_online', (userId) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    socket.on('user_offline', ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const newOnlineUsers = new Set(prev);
        newOnlineUsers.delete(userId);
        return newOnlineUsers;
      });
      setContacts(prev => prev.map(c => c.id === userId ? { ...c, lastSeen } : c));
    });

    return () => {
      socket.off('user_online');
      socket.off('user_offline');
    };
  }, [socket]);

  // Effect to handle incoming messages and update unread counts
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setContacts((prevContacts) => {
        const otherUserId = message.senderId === currentUserId ? message.recipientId : message.senderId;

        const updatedContacts = prevContacts.map((c) => {
          if (c.id === otherUserId) {
            return {
              ...c,
              lastMessage: message,
              unreadCount: c.id !== selectedContact?.id ? (c.unreadCount || 0) + 1 : 0,
            };
          }
          return c;
        });

        // Sort to bring the contact with the new message to the top
        return updatedContacts.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });
      });
    };

    socket.on('receiveMessage', handleNewMessage);
    socket.on('messageSent', handleNewMessage); // Also update on sent messages

    return () => {
      socket.off('receiveMessage', handleNewMessage);
      socket.off('messageSent', handleNewMessage);
    };
  }, [socket, selectedContact, currentUserId]);

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    // Reset unread count for the selected contact on the UI
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c)));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Left Panel: Contact List (Full screen on mobile, sidebar on desktop) */}
      <div className={`w-full md:flex md:w-1/3 flex-col ${selectedContact ? 'hidden' : 'flex'}`}>
        <ContactList contacts={contacts} onSelectContact={handleSelectContact} selectedContactId={selectedContact?.id} onlineUsers={onlineUsers} currentUserId={currentUserId} />
      </div>

      {/* Right Panel: Chat Window or Welcome Screen (Takes over on mobile when a contact is selected) */}
      <div className={`w-full md:flex md:w-2/3 flex-col ${!selectedContact ? 'hidden' : 'flex'}`}>
        {selectedContact ? (
          <ChatWindow contact={selectedContact} onBack={() => setSelectedContact(null)} socket={socket} isOnline={onlineUsers.has(selectedContact.id)} />
        ) : (
          <Welcome /> // This will only be visible on desktop now
        )}
      </div>
    </div>
  );
};

export default ChatPage;
