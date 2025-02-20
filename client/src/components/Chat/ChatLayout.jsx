import { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import UserList from './UserList';
import ChatWindow from './ChatWindow';
import axios from 'axios';

export default function ChatLayout() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await axios.get('/api/users');
        setContacts(res.data || []); // Ensure it's always an array
      } catch (err) {
        console.error('Error fetching contacts:', err);
        setError('Failed to load contacts');
        setContacts([
          { id: '6412f3c2f3b2c3d4e5f6a7b8', email: 'user2@example.com' },
          { id: '6412f3c2f3b2c3d4e5f6a7b9', email: 'user3@example.com' }
        ]); // Fallback to empty array
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  if (loading) {
    return <div className="p-4">Loading contacts...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/3 border-r">
        <UserList 
          contacts={contacts} 
          onSelect={setSelectedContact}
          selectedContact={selectedContact}
        />
      </div>
      <div className="flex-1">
        {selectedContact ? (
          <ChatWindow contact={selectedContact} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
}