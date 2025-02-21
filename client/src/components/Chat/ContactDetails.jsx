import React from "react";

// A simple helper to compute initials (same logic as before)
const getInitials = (name) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ContactDetails = ({ contact, onClose }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header with Close Button */}
      <div className="flex justify-start p-4">
        <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-2xl">
          &times;
        </button>
      </div>
      {/* Contact Info */}
      <div className="flex flex-col items-center p-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold mb-4">
          {getInitials(contact.name)}
        </div>
        <div className="text-xl font-semibold mb-1">{contact.name}</div>
        <div className="text-gray-500 mb-1">{contact.email}</div>
        <div className="text-gray-500">
          {contact.phone ? contact.phone : "Phone not available"}
        </div>
      </div>
      {/* Grey line below details with margins */}
      <hr className="border-t border-gray-300 w-11/12 mx-auto" />
      {/* (Optional) Additional details could go here */}
      <div className="flex-1"></div>
    </div>
  );
};

export default ContactDetails;
