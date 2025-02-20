import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ChatWindow from './components/Chat/ChatWindow';
import { SocketProvider } from './contexts/SocketContext';

const App = () => {
  const [user, setUser] = useState(null);

  return (
    <SocketProvider>
      <Router>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login setUser={setUser} />} />
              <Route path="/signup" element={<Signup setUser={setUser} />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            <>
              <Route path="/chat" element={<ChatWindow user={user} />} />
              <Route path="*" element={<Navigate to="/chat" />} />
            </>
          )}
        </Routes>
      </Router>
    </SocketProvider>
  );
};

export default App;
