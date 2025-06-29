/* eslint-disable no-undef */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MessageStatus from './MessageStatus';
import QuotedMessage from './QuotedMessage';
import ReplyPreview from './ReplyPreview';
import ChatActionBar from './ChatActionBar';
import ConfirmationModal from './ConfirmationModal';
import ForwardModal from './ForwardModal';
import ImagePreviewModal from './ImagePreviewModal';
import ImageViewer from './ImageViewer';
import AudioPlayer from './AudioPlayer';
import UndoToast from './UndoToast';

const formatLastSeen = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) {
    return `last seen today at ${time}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `last seen yesterday at ${time}`;
  }
  return `last seen on ${date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
  })}`;
};

const formatDateDivider = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const ChatWindow = ({ contact, onBack, socket, isOnline }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [modalOptions, setModalOptions] = useState(null);
  const [undoAction, setUndoAction] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [viewingImage, setViewingImage] = useState(null);
  const [imageToSend, setImageToSend] = useState(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const { token } = useAuth(); // We need the token to decode the user ID
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      // Decode the payload of the JWT to get the user ID
      return JSON.parse(atob(token.split('.')[1])).userId;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }, [token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Fetch chat history when a contact is selected
    // Also reset the typing indicator
    setIsTyping(false);
    setReplyingTo(null);
    setUndoAction(null);
    setIsRecording(false);
    setViewingImage(null);
    setImageToSend(null);
    setIsForwardModalOpen(false);
    setSelectedMessages(new Set()); // Clear selection when chat changes
    setMessages([]);

    if (contact) {
      api.get(`/messages/${contact.id}`).then((response) => {
        setMessages(response.data);

        // After fetching history, mark all as seen
        if (socket) {
          socket.emit('markAsSeen', { senderId: contact.id });
        }
      });
    }
  }, [contact, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      // Add message if it's part of the current conversation
      if (message.senderId === contact?.id || message.senderId === currentUserId) {
        setMessages((prevMessages) => [...prevMessages, message]);
        // If the received message is from the contact, mark it as seen immediately
        if (message.senderId === contact?.id) {
          socket.emit('markAsSeen', { senderId: contact.id });
        }
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    // Also listen for our own sent messages for immediate UI update
    socket.on('messageSent', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageSent', handleReceiveMessage);
    };
  }, [socket, contact, currentUserId]);

  // Effect to listen for message status updates from the server
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status } : msg
        )
      );
    };

    const handleMessagesSeen = ({ recipientId }) => {
      // This event is received by the sender when the recipient sees the messages.
      // The `recipientId` in the payload is the ID of the user who saw the messages.
      if (contact?.id === recipientId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.senderId === currentUserId && msg.status !== 'SEEN'
              ? { ...msg, status: 'SEEN' }
              : msg
          )
        );
      }
    };

    socket.on('messageStatusUpdated', handleStatusUpdate);
    socket.on('messagesSeen', handleMessagesSeen);

    return () => {
      socket.off('messageStatusUpdated', handleStatusUpdate);
      socket.off('messagesSeen', handleMessagesSeen);
    };
  }, [socket, contact, currentUserId]);

  // Effect to listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ senderId }) => {
      if (senderId === contact?.id) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === contact?.id) {
        setIsTyping(false);
      }
    };

    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, contact]);

  // Effect to listen for deleted messages
  useEffect(() => {
    if (!socket) return;

    const handleMessagesDeleted = ({ messageIds }) => {
      setMessages(prev =>
        prev.map(msg => (messageIds.includes(msg.id) ? { ...msg, isDeleted: true, content: '' } : msg))
      );
    };

    socket.on('messagesDeleted', handleMessagesDeleted);
    return () => socket.off('messagesDeleted', handleMessagesDeleted);
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && contact && socket) {
      // Stop the typing indicator immediately on send
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('stopTyping', { recipientId: contact.id });

      socket.emit('sendMessage', {
        recipientId: contact.id,
        content: newMessage,
        repliedToId: replyingTo ? replyingTo.id : null,
      });

      setNewMessage('');
      setReplyingTo(null);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !contact) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('startTyping', { recipientId: contact.id });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { recipientId: contact.id });
    }, 2000); // 2 seconds of inactivity
  };

  const handleToggleSelectMessage = (messageId) => {
    // If we are not in selection mode, a long press will activate it.
    // Otherwise, a simple tap will toggle selection.
    setSelectedMessages(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      return newSelected;
    });
  };

  const handleReplyFromSelection = () => {
    if (selectedMessages.size !== 1) return;
    const messageId = selectedMessages.values().next().value;
    const messageToReply = messages.find(m => m.id === messageId);
    if (messageToReply) {
      setReplyingTo(messageToReply);
    }
    setSelectedMessages(new Set()); // Exit selection mode
  };

  const handleDelete = () => {
    const selectedArray = Array.from(selectedMessages);
    const messagesToDelete = messages.filter(m => selectedArray.includes(m.id));

    // Case 1: Deleting a "This message was deleted" placeholder
    if (messagesToDelete.every(m => m.isDeleted)) {
      deleteForMe(selectedArray);
      return;
    }

    // Case 2: Deleting messages sent by the current user
    const canDeleteForEveryone = messagesToDelete.every(m => m.senderId === currentUserId && !m.isDeleted);

    if (canDeleteForEveryone) {
      setModalOptions({
        title: `Delete ${selectedArray.length} message${selectedArray.length > 1 ? 's' : ''}?`,
        options: [
          { text: 'Delete for Everyone', action: () => deleteForEveryone(selectedArray), style: 'bg-red-500 text-white hover:bg-red-600' },
          { text: 'Delete for Me', action: () => deleteForMe(selectedArray), style: 'bg-gray-200 text-gray-800 hover:bg-gray-300' },
        ],
      });
    } else {
      // Case 3: Deleting received messages or a mix
      setModalOptions({
        title: `Delete ${selectedArray.length} message${selectedArray.length > 1 ? 's' : ''}?`,
        message: "You can only delete these messages for yourself. Other chat members will still see them.",
        options: [
          { text: 'Delete for Me', action: () => deleteForMe(selectedArray), style: 'bg-red-500 text-white hover:bg-red-600' },
        ],
      });
    }
  };

  const performDelete = (messageIds, deleteType) => {
    const originalMessages = messages;
    const newMessages = messages.filter(m => !messageIds.includes(m.id));

    if (deleteType === 'FOR_EVERYONE') {
      // Optimistically update UI for "Delete for Everyone"
      setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, isDeleted: true, content: '' } : m));
    } else {
      // Optimistically update UI for "Delete for Me"
      setMessages(newMessages);
    }

    setUndoAction({
      type: 'DELETE',
      payload: { originalMessages },
      timeoutAction: () => {
        if (deleteType === 'FOR_EVERYONE') {
          socket.emit('deleteMessages', { messageIds });
        } else {
          const locallyDeleted = JSON.parse(localStorage.getItem('locallyDeleted') || '{}');
          locallyDeleted[contact.id] = [...(locallyDeleted[contact.id] || []), ...messageIds];
          localStorage.setItem('locallyDeleted', JSON.stringify(locallyDeleted));
        }
      }
    });
  };

  const deleteForMe = (messageIds) => {
    performDelete(messageIds, 'FOR_ME');
    setModalOptions(null);
    setSelectedMessages(new Set());
  };

  const deleteForEveryone = (messageIds) => {
    performDelete(messageIds, 'FOR_EVERYONE');
    setModalOptions(null);
    setSelectedMessages(new Set());
  };

  const handleForward = () => {
    const fetchUsersAndShowModal = async () => {
      try {
        const response = await api.get('/users');
        setAllContacts(response.data);
        setIsForwardModalOpen(true);
      } catch (error) {
        console.error("Failed to fetch users for forwarding", error);
        alert("Could not load contacts to forward to.");
      }
    };
    fetchUsersAndShowModal();
  };

  const handleConfirmForward = (recipientIds) => {
    if (socket) {
      socket.emit('forwardMessages', {
        messageIds: Array.from(selectedMessages),
        recipientIds,
      });
    }
    setIsForwardModalOpen(false);
    setSelectedMessages(new Set());
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageToSend(file);
    }
    // Clear the input value so the same file can be selected again
    e.target.value = null;
  };

  const handleSendImage = async (caption) => {
    if (!imageToSend || !socket) return;

    try {
      const formData = new FormData();
      formData.append('media', imageToSend);

      const uploadRes = await api.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      socket.emit('sendMessage', { recipientId: contact.id, type: 'IMAGE', content: uploadRes.data.mediaUrl, caption });
    } catch (error) {
      console.error("Failed to send image", error);
      alert("Failed to send image. Please try again.");
    } finally {
      setImageToSend(null);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Specify a more compatible mimeType
      const options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.warn(`${options.mimeType} is not supported, falling back to default.`);
      }
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      const audioChunks = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('media', audioBlob, 'voice-note.webm');

        try {
          const uploadRes = await api.post('/upload/media', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          socket.emit('sendMessage', { recipientId: contact.id, type: 'AUDIO', content: uploadRes.data.mediaUrl });
        } catch (error) {
          console.error("Failed to send voice note", error);
          alert("Failed to send voice note. Please try again.");
        }

        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access the microphone. Please check your browser permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Stop without saving by not calling onstop's logic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
  };

  const isInSelectionMode = selectedMessages.size > 0;

  // Filter out locally deleted messages before rendering
  const locallyDeletedSet = new Set(JSON.parse(localStorage.getItem('locallyDeleted') || '{}')[contact?.id] || []);
  const visibleMessages = messages.filter(m => !locallyDeletedSet.has(m.id));

  const handleUndo = () => {
    if (undoAction?.type === 'DELETE') {
      setMessages(undoAction.payload.originalMessages);
    }
    setUndoAction(null);
  };

  if (!contact) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Chat Header */}
      {isInSelectionMode ? (
        <ChatActionBar
          selectedCount={selectedMessages.size}
          onCancel={() => setSelectedMessages(new Set())}
          onReply={handleReplyFromSelection}
          onDelete={handleDelete}
          onForward={handleForward}
        />
      ) : (
        <NormalChatHeader contact={contact} onBack={onBack} isOnline={isOnline} />
      )}

      {/* Message Display Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {visibleMessages.map((msg, index) => {
          const showDivider =
            index === 0 ||
            new Date(msg.createdAt).toDateString() !==
              new Date(visibleMessages[index - 1].createdAt).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {showDivider && (
                <div className="flex justify-center my-4">
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-slate-200 rounded-full">
                    {formatDateDivider(msg.createdAt)}
                  </div>
                </div>
              )}
              {msg.isDeleted ? (
                <div className={`flex items-center ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div className="italic text-gray-500 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                    This message was deleted
                  </div>
                </div>
              ) : (
                <div className={`flex items-end ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'} mb-2`}>
                  <MessageRow
                    msg={msg}
                    currentUserId={currentUserId}
                    onReply={() => setReplyingTo(msg)}
                    isSelected={selectedMessages.has(msg.id)}
                    onToggleSelect={() => handleToggleSelectMessage(msg.id)}
                    isInSelectionMode={isInSelectionMode}
                    onImageClick={() => setViewingImage(`${API_BASE_URL}${msg.content}`)}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-xl p-2 px-4 shadow-sm flex items-center space-x-1">
              <span className="block w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="block w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="block w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <div className="bg-slate-100">
        <ReplyPreview message={replyingTo} onCancel={() => setReplyingTo(null)} currentUserId={currentUserId} />
      </div>
      {isRecording ? (
        <div className="p-4 bg-slate-100 flex items-center justify-between">
          <div className="flex items-center text-red-500">
            <span className="block w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
            <span>{new Date(recordingTime * 1000).toISOString().substr(14, 5)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleCancelRecording} className="p-2 text-gray-600 hover:text-red-500">Cancel</button>
            <button onClick={handleStopRecording} className="p-3 font-semibold text-white transition-transform duration-200 bg-emerald-500 rounded-full hover:bg-emerald-600 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-100">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <label htmlFor="file-upload" className="p-2 text-gray-500 rounded-full cursor-pointer hover:bg-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </label>
            <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInputChange}
              className="flex-1 w-full px-4 py-2 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {newMessage.trim() ? (
              <button type="submit" className="p-3 font-semibold text-white transition-transform duration-200 bg-emerald-500 rounded-full hover:bg-emerald-600 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            ) : (
              <button type="button" onMouseDown={handleStartRecording} onTouchStart={handleStartRecording} className="p-3 font-semibold text-white transition-transform duration-200 bg-emerald-500 rounded-full hover:bg-emerald-600 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>
            )}
          </form>
        </div>
      )}
      {undoAction && (
        <UndoToast
          message="Message deleted"
          onUndo={handleUndo}
          onTimeout={undoAction.timeoutAction}
        />
      )}
      {modalOptions && <ConfirmationModal {...modalOptions} onCancel={() => setModalOptions(null)} />}
      {isForwardModalOpen && (
        <ForwardModal
          contacts={allContacts}
          messageCount={selectedMessages.size}
          onCancel={() => setIsForwardModalOpen(false)}
          onForward={handleConfirmForward}
        />
      )}
      {viewingImage && (
        <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
      )}
      {imageToSend && (
        <ImagePreviewModal file={imageToSend} onCancel={() => setImageToSend(null)} onSend={handleSendImage} />
      )}
    </div>
  );
};

const NormalChatHeader = ({ contact, onBack, isOnline }) => (
  <div className="flex items-center p-4 bg-slate-100 border-b border-gray-200">
    <button onClick={onBack} className="mr-4 text-slate-600 hover:text-slate-800 md:hidden">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
    <div className="relative mr-3">
      {contact.profilePictureUrl ? (
        <img src={`${API_BASE_URL}${contact.profilePictureUrl}`} alt={contact.username || 'Profile'} className="object-cover w-10 h-10 rounded-full" />
      ) : (
        <div className="flex items-center justify-center w-10 h-10 text-lg font-bold text-white rounded-full bg-emerald-500">
          {(contact.username || contact.phoneNumber).charAt(0).toUpperCase()}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-semibold text-slate-800 truncate">{contact.username || `${contact.countryCode} ${contact.phoneNumber}`}</h3>
      <p className="text-xs text-gray-500">
        {isOnline ? <span className="font-semibold text-emerald-500">Online</span> : formatLastSeen(contact.lastSeen)}
      </p>
    </div>
  </div>
);

const MessageRow = ({ msg, currentUserId, onReply, isSelected, onToggleSelect, isInSelectionMode, onImageClick }) => {
  const longPressTimer = useRef();
  const pressStartTime = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only allow right swipe for reply, and not in selection mode
      if (eventData.dir === 'Right' && !isInSelectionMode) {
        const offset = Math.min(eventData.deltaX, 75); // Cap the swipe distance
        setSwipeOffset(offset);
      }
    },
    onSwipedRight: () => {
      if (!isInSelectionMode) onReply();
    },
    onSwiped: () => {
      // Reset offset when swipe is done
      setSwipeOffset(0);
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10, // Minimum distance (in px) to trigger a swipe
  });

  const handlePointerDown = () => {
    pressStartTime.current = Date.now();
    // Only set timer if not in selection mode, to initiate it
    if (!isInSelectionMode) {
      longPressTimer.current = setTimeout(() => {
        onToggleSelect();
        pressStartTime.current = null; // Prevent click logic on long press
      }, 500); // 500ms for long press
    }
  };

  const handlePointerUp = () => {
    clearTimeout(longPressTimer.current);
    if (pressStartTime.current) {
      const pressDuration = Date.now() - pressStartTime.current;
      if (pressDuration < 500) {
        // It's a short click/tap
        if (isInSelectionMode) {
          onToggleSelect();
        }
      }
    }
    pressStartTime.current = null;
  };

  return (
    <div
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      className={`w-full flex items-end rounded-lg px-2 -mx-2 cursor-pointer ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'} ${isSelected ? 'bg-emerald-100' : 'bg-transparent'}`}
    >
      <div {...handlers} style={{ transform: `translateX(${swipeOffset}px)` }} className="transition-transform duration-200 ease-out">
        <MessageBubble msg={msg} currentUserId={currentUserId} isSelected={isSelected} onImageClick={onImageClick} />
      </div>
    </div>
  );
};

// Simplified presentational component for the message bubble
const MessageBubble = ({ msg, currentUserId, isSelected, onImageClick }) => {
  // Determine bubble classes based on state for better readability
  const forwardedLabelColor = isSelected ? 'text-slate-600' : (msg.senderId === currentUserId ? 'text-emerald-100' : 'text-gray-500');
  const bubbleClasses = isSelected
    ? 'bg-emerald-200 text-slate-800' // Selected state with dark text
    : msg.senderId === currentUserId
    ? 'bg-emerald-500 text-white' // Outgoing message
    : 'bg-white text-slate-800'; // Incoming message

  const mediaBubbleClasses = isSelected
    ? 'bg-emerald-200' // Selected media
    : msg.senderId === currentUserId
    ? 'bg-emerald-500' // Outgoing media - can be transparent if image has no padding
    : 'bg-gray-200'; // Incoming media

  return (
    <div
      className={`relative rounded-xl shadow-sm ${msg.type === 'IMAGE' ? `p-1 ${mediaBubbleClasses} max-w-[250px]` : msg.type === 'AUDIO' ? `p-2 ${bubbleClasses} w-64` : `px-3 py-2 ${bubbleClasses} max-w-xs lg:max-w-md`}`}>
        {msg.type === 'IMAGE' ? (
          <ImageMessage msg={msg} isSelected={isSelected} currentUserId={currentUserId} onImageClick={onImageClick} />
        ) : msg.type === 'AUDIO' ? (
          <AudioPlayer src={`${API_BASE_URL}${msg.content}`} />
        ) : (
          <>
        {msg.isForwarded && (
          <div className={`flex items-center text-xs mb-1 ${forwardedLabelColor}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            <span>Forwarded</span>
          </div>
        )}
        {msg.repliedTo && <QuotedMessage message={msg.repliedTo} currentUserId={currentUserId} />}
        <p className="pr-14 break-words">{msg.content}</p>
        <div className="absolute bottom-1.5 right-2 flex items-center space-x-1">
          <span className={`text-xs ${isSelected ? 'text-gray-600' : (msg.senderId === currentUserId ? 'text-gray-200' : 'text-gray-400')}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.senderId === currentUserId && <MessageStatus status={msg.status} />}
        </div>
          </>
        )}
      </div>
  );
};

const ImageMessage = ({ msg, isSelected, currentUserId, onImageClick }) => {
  const captionColor = isSelected ? 'text-slate-700' : (msg.senderId === currentUserId ? 'text-white' : 'text-slate-800');
  const timeColor = isSelected ? 'text-gray-600' : 'text-gray-200';

  return (
    <div>
      <img
        src={`${API_BASE_URL}${msg.content}`}
        alt={msg.caption || 'Image message'}
        className="rounded-lg w-full object-cover cursor-pointer"
        onClick={onImageClick}
      />
      {/* Container for caption and metadata */}
      <div className={`flex items-end justify-between p-1.5 ${!msg.caption && 'h-6'}`}>
        {/* Caption takes up available space */}
        {msg.caption && <p className={`text-sm break-words mr-2 ${captionColor}`}>{msg.caption}</p>}
        {/* Metadata is pushed to the right */}
        <div className="ml-auto flex-shrink-0 self-end flex items-center space-x-1">
          <span className={`text-xs ${timeColor}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.senderId === currentUserId && <MessageStatus status={msg.status} />}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
