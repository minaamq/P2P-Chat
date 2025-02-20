import React from 'react';

const Message = ({ message, isOwn }) => {
  return (
    <div className={`mb-2 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`p-2 rounded ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
        <p>{message.content}</p>
        <small className="block text-xs text-gray-600">
          {new Date(message.timestamp).toLocaleTimeString()}
        </small>
      </div>
    </div>
  );
};

export default Message;
