import React, { useState, useEffect } from "react";

// Helper function to extract initials from a name
const getInitials = (name) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[1][0]).toUpperCase();
};

// Helper function to truncate text based on maxLength
const truncateText = (text, maxLength) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const UserList = ({ contacts, activeContact, setActiveContact, onlineUsers }) => {
  const [maxLength, setMaxLength] = useState(30);

  useEffect(() => {
    const handleResize = () => {
      setMaxLength(window.innerWidth >= 1280 ? 30 : 15);
    };

    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="overflow-y-auto">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          onClick={() => setActiveContact(contact)}
          className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 ${
            activeContact?.id === contact.id ? "bg-gray-100" : ""
          }`}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              {getInitials(contact.name)}
            </div>
            {onlineUsers[contact.id] && (
              <div className="absolute top-1 right-3 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{contact.name}</div>
            <div className="text-sm text-gray-500 truncate">
              {truncateText(contact.lastMessage, maxLength)}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500">
              {contact.lastMessageTime
                ? new Date(contact.lastMessageTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  })
                : ""}
            </div>
            {contact.unreadCount > 0 && (
              <div className="mt-1 bg-[#3758F9] text-white rounded-full px-2 py-0.5 text-xs">
                {contact.unreadCount}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserList;
