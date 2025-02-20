import React from 'react';

const UserList = ({ contacts, activeContact, setActiveContact, onlineUsers }) => {
  return (
    <div className="p-4 flex-1 overflow-y-auto">
      <ul>
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className={`p-2 rounded cursor-pointer flex justify-between items-center ${
              activeContact && activeContact.id === contact.id ? 'bg-blue-200' : 'hover:bg-gray-200'
            }`}
            onClick={() => setActiveContact(contact)}
          >
            <div>{contact.name}</div>
            <div>
              {onlineUsers && onlineUsers[contact.id] ? (
                <span className="text-green-500">●</span>
              ) : (
                <span className="text-gray-400">●</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
