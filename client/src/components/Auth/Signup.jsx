import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = ({ setUser }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', mobile: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5001/api/signup', formData);
      setUser({ id: res.data.userId, name: formData.name, email: formData.email });
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data.message || 'Error signing up');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-200">
      <div className="bg-white p-8 rounded shadow-md w-96 min-h-[500px] flex flex-col justify-center relative">
        {/* Bottom Left Dots */}
        <div className="absolute bottom-1 left-1 grid grid-cols-4 gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={`bl-${i}`} className="w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
          ))}
        </div>

        {/* Top Right Dots */}
        <div className="absolute top-1 right-1 grid grid-cols-4 gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={`tr-${i}`} className="w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
          ))}
        </div>

        <h2 className="text-2xl mb-6 text-center flex items-center justify-center">
          <img src="src/assets/IMG_6731.jpg" alt="Logo" className="w-8 h-8 mr-2" />
          chat
        </h2>

        {error && <p className="text-red-500">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input 
              type="text" 
              name="name" 
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 text-[0.8rem]"
              required 
            />
          </div>
          <div className="mb-4">
            <input 
              type="email" 
              name="email" 
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 text-[0.8rem]"
              required 
            />
          </div>
          <div className="mb-4">
            <input 
              type="text" 
              name="mobile"
              placeholder="Phone Number"
              value={formData.mobile}
              onChange={handleChange}
              className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 text-[0.8rem]"
              required 
            />
          </div>
          <div className="mb-4">
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 text-[0.8rem]"
              required 
            />
          </div>
          <button type="submit" className="w-full bg-slate-400 text-white p-2 rounded">Sign Up</button>
        </form>

        <p className="mt-4 text-center">
          Already have an account? <a href="/login" className="text-blue-500">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
