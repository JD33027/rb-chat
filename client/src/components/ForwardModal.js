import React, { useState } from 'react';
import { API_BASE_URL } from '../services/api';

const ForwardModal = ({ contacts, messageCount, onCancel, onForward }) => {
  const [selectedContacts, setSelectedContacts] = useState(new Set());

  const handleToggleContact = (contactId) => {
    setSelectedContacts(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(contactId)) {
        newSelected.delete(contactId);
      } else {
        newSelected.add(contactId);
      }
      return newSelected;
    });
  };

  const handleSend = () => {
    if (selectedContacts.size > 0) {
      onForward(Array.from(selectedContacts));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl flex flex-col" style={{ height: '80vh' }}>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Forward {messageCount} message{messageCount > 1 ? 's' : ''} to...</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {contacts.map(contact => (
            <div key={contact.id} onClick={() => handleToggleContact(contact.id)} className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="relative mr-4">
                {contact.profilePictureUrl ? <img src={`${API_BASE_URL}${contact.profilePictureUrl}`} alt={contact.username || 'Profile'} className="object-cover w-10 h-10 rounded-full" /> : <div className="flex items-center justify-center w-10 h-10 text-xl font-bold text-white rounded-full bg-emerald-500">{(contact.username || contact.phoneNumber).charAt(0).toUpperCase()}</div>}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{contact.username || `${contact.countryCode} ${contact.phoneNumber}`}</p>
              </div>
              <input type="checkbox" checked={selectedContacts.has(contact.id)} readOnly className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex justify-between">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button onClick={handleSend} disabled={selectedContacts.size === 0} className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">Send</button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;

