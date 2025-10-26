import React from 'react';
import { useNavigate } from 'react-router-dom';

const ScopeBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full bg-purple-700 text-white p-4 overflow-hidden rounded-lg shadow-lg">
      <div className="absolute inset-0 z-0 opacity-20">
        {/* Abstract background shapes */}
        <div className="absolute top-1/4 left-0 w-12 h-3 bg-purple-300 transform -rotate-45 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-4 bg-purple-400 transform rotate-12 rounded-full"></div>
        <div className="absolute bottom-1/4 right-0 w-14 h-3 bg-purple-300 transform rotate-45 rounded-full"></div>
        <div className="absolute top-1/3 right-1/4 w-10 h-2 bg-purple-400 transform -rotate-30 rounded-full"></div>
        <div className="absolute bottom-1/3 left-1/3 w-14 h-3 bg-purple-300 transform rotate-60 rounded-full"></div>
      </div>
      <div className="relative z-10 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between">
        <div className="text-center sm:text-left mb-2 sm:mb-0">
          <h2 className="text-md font-bold lg:text-xl mb-1">Scope</h2>
          <p className="text-xs opacity-90 lg:text-sm">Identify components and know what to do with it</p>
        </div>
        <button
          className="bg-white text-purple-700 px-6 py-2 rounded-full font-semibold shadow-md hover:bg-gray-100 transition-colors duration-300"
          onClick={() => navigate('/identify-know-upload')}
        >
          Start now
        </button>
      </div>
    </div>
  );
};

export default ScopeBanner;
