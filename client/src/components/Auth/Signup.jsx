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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl mb-6 text-center">Sign Up</h2>
        {error && <p className="text-red-500">{error}</p>}
        <form onSubmit={handleSubmit}>
        <div className="mb-4">
            <label>Name:</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required 
            />
          </div>
          <div className="mb-4">
            <label>Email:</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required 
            />
          </div>
          <div className="mb-4">
            <label>Mobile:</label>
            <input 
              type="text" 
              name="mobile" 
              value={formData.mobile}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required 
            />
          </div>
          <div className="mb-4">
            <label>Password:</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Sign Up</button>
        </form>
        <p className="mt-4 text-center">
          Already have an account? <a href="/login" className="text-blue-500">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
