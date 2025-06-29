import React from 'react';

const Welcome = () => {
  return (
    <div className="flex-col items-center justify-center hidden h-full text-center bg-slate-50 md:flex">
      <div className="p-4 text-white rounded-full bg-emerald-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-slate-800">Welcome to RB-CHAT</h2>
      <p className="mt-2 text-slate-500">Select a contact to start messaging.</p>
    </div>
  );
};

export default Welcome;
