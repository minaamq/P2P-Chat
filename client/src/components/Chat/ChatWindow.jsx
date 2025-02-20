import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import UserList from './UserList';
import Message from './Message';
import { useSocket } from '../../contexts/SocketContext';

const ChatWindow = ({ user }) => {
  const storageKey = `messages_${user.id}`;
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });
  // Each contact: { id, name, email, temporary }
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const { socket, onlineUsers } = useSocket();
  const prevActiveRef = useRef(null);

  // Fetch messages for the logged-in user from the server
  useEffect(() => {
    if (user.id) {
      axios
        .get(`http://localhost:5001/api/messages?userId=${user.id}`)
        .then((res) => {
          // Group messages by contact (sender/receiver)
          const fetchedMessages = res.data.reduce((acc, message) => {
            const contactId = message.sender === user.id ? message.receiver : message.sender;
            if (!acc[contactId]) acc[contactId] = [];
            acc[contactId].push(message);
            return acc;
          }, {});
          setMessages(fetchedMessages);
          localStorage.setItem(storageKey, JSON.stringify(fetchedMessages));
        })
        .catch((err) => console.error(err));
    }
  }, [user.id, storageKey]);

  // Auto-trigger search as the user types (no debounce for brevity)
  useEffect(() => {
    if (searchQuery.trim()) {
      axios
        .get(`http://localhost:5001/api/search?query=${searchQuery}`)
        .then((res) => {
          // Exclude current user from search results
          const results = res.data.filter((u) => u._id !== user.id);
          setSearchResults(results);
        })
        .catch((err) => console.error(err));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, user.id]);

  // Helper: fetch user details by ID
  const fetchUserDetails = useCallback(async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/user/${userId}`);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch user details', err);
      return null;
    }
  }, []);

  // Update a contact's details and mark as permanent (temporary: false)
  const updateContactDetails = useCallback(
    async (contactId) => {
      const details = await fetchUserDetails(contactId);
      if (details) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId
              ? { id: details._id, name: details.name, email: details.email, temporary: false }
              : c
          )
        );
        if (activeContact && activeContact.id === contactId) {
          setActiveContact({
            id: details._id,
            name: details.name,
            email: details.email,
            temporary: false
          });
        }
      }
    },
    [fetchUserDetails, activeContact]
  );

  // Handler for incoming messages via socket
  const handleReceiveMessage = useCallback(
    (message) => {
      const contactId = message.sender === user.id ? message.receiver : message.sender;
      setMessages((prev) => {
        const updated = { ...prev };
        if (!updated[contactId]) updated[contactId] = [];
        // Deduplicate messages based on unique _id
        const exists = updated[contactId].some((msg) => msg._id === message._id);
        if (!exists) {
          updated[contactId].push(message);
        }
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
      // Add contact if not already present. When added via a received message, mark as permanent.
      setContacts((prev) => {
        if (!prev.some((c) => c.id === contactId)) {
          return [...prev, { id: contactId, name: contactId, email: '', temporary: false }];
        } else if (prev.find((c) => c.id === contactId).temporary) {
          // If it exists as temporary, mark it permanent.
          return prev.map((c) =>
            c.id === contactId ? { ...c, temporary: false } : c
          );
        }
        return prev;
      });
      // If contact's name is still the fallback (equal to id), update details.
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact || contact.name === contact.id) {
        updateContactDetails(contactId);
      }
    },
    [user.id, contacts, storageKey, updateContactDetails]
  );

  // Register the socket listener
  useEffect(() => {
    if (socket) {
      socket.on('receive_message', handleReceiveMessage);
      return () => {
        socket.off('receive_message', handleReceiveMessage);
      };
    }
  }, [socket, handleReceiveMessage]);

  // Notify server when user connects
  useEffect(() => {
    if (socket && user.id) {
      socket.emit('user_connected', user.id);
    }
  }, [socket, user.id]);

  // When switching active contacts, remove previous temporary contact if no messages were exchanged
  useEffect(() => {
    if (
      prevActiveRef.current &&
      activeContact &&
      prevActiveRef.current.id !== activeContact.id
    ) {
      const prev = prevActiveRef.current;
      if (prev.temporary && (!messages[prev.id] || messages[prev.id].length === 0)) {
        setContacts((prevContacts) =>
          prevContacts.filter((c) => c.id !== prev.id)
        );
      }
    }
    prevActiveRef.current = activeContact;
  }, [activeContact, messages]);

  // Optionally derive contacts from messages that have at least one message
  useEffect(() => {
    const contactIds = Object.keys(messages);
    setContacts((prev) => {
      let merged = [...prev];
      contactIds.forEach((id) => {
        if (!merged.find((c) => c.id === id) && messages[id].length > 0) {
          merged.push({ id, name: id, email: '', temporary: false });
        }
      });
      // Deduplicate using a Map keyed by id.
      return Array.from(new Map(merged.map((c) => [c.id, c])).values());
    });
  }, [messages]);

  // Handle sending a message
  const handleSend = () => {
    if (activeContact && input.trim()) {
      const message = {
        sender: user.id,
        receiver: activeContact.id,
        content: input,
        timestamp: new Date().toISOString()
      };
      socket.emit('send_message', message);
      setInput('');
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel: Contacts and Search */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl">Chats</h3>
          <div>{user.name}</div>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder="Search by email or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <UserList
          contacts={contacts}
          activeContact={activeContact}
          setActiveContact={setActiveContact}
          onlineUsers={onlineUsers}
        />
        <div className="p-4 border-t">
          <h4 className="text-lg">Search Results</h4>
          <ul>
            {searchResults.map((contact) => (
              <li
                key={contact._id}
                className="p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => {
                  // Add the selected search result as a temporary contact
                  setContacts((prev) => {
                    if (!prev.some((c) => c.id === contact._id)) {
                      return [...prev, { id: contact._id, name: contact.name, email: contact.email, temporary: true }];
                    }
                    return prev;
                  });
                  setActiveContact({ id: contact._id, name: contact.name, email: contact.email, temporary: true });
                  setSearchResults([]);
                  setSearchQuery('');
                }}
              >
                {contact.name} ({contact.email})
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel: Chat Window */}
      <div className="w-2/3 flex flex-col">
        <div className="p-4 border-b">
          {activeContact ? (
            <div className="flex justify-between items-center">
              <h2 className="text-2xl">{activeContact.name}</h2>
              <span className="text-xl">
                {onlineUsers && onlineUsers[activeContact.id] ? (
                  <span className="text-green-500">● Online</span>
                ) : (
                  <span className="text-gray-400">● Offline</span>
                )}
              </span>
            </div>
          ) : (
            <h2 className="text-2xl">Select a contact to start chatting</h2>
          )}
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {activeContact && messages[activeContact.id] ? (
            messages[activeContact.id].map((msg) => (
              <Message key={msg._id || msg.timestamp} message={msg} isOwn={msg.sender === user.id} />
            ))
          ) : (
            <p>Select a contact to start chatting.</p>
          )}
        </div>
        {activeContact && (
          <div className="p-4 border-t flex">
            <input
              type="text"
              className="flex-1 border p-2 rounded mr-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button onClick={handleSend} className="bg-blue-500 text-white p-2 rounded">
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
