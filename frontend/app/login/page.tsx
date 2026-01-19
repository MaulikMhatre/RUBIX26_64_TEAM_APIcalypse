"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Attempting login for:", staffId);
    const res = await fetch('http://localhost:8000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId, password })
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('staff_id', data.staff_id); // This is required for the worklist!
      // RBAC Redirection
      if (data.role === 'Nurse') router.push('/staff/worklist');
      else if (data.role === 'Doctor') router.push('/dashboard');
      else router.push('/admin');
    } else {
      alert("Login Failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-96">
        <h1 className="text-2xl font-bold text-white mb-6">Staff Portal Login</h1>
        <input 
          type="text" placeholder="Staff ID (e.g., N-01)" 
          className="w-full p-3 mb-4 bg-black border border-slate-700 rounded text-white"
          onChange={(e) => setStaffId(e.target.value)}
        />
        <input 
          type="password" placeholder="Password" 
          className="w-full p-3 mb-6 bg-black border border-slate-700 rounded text-white"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full p-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500">
          Access System
        </button>
      </form>
    </div>
  );
}