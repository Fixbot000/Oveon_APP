import React from 'react';

export const AdsBanner: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-[#3a2f4a] p-4 text-white shadow-md lg:p-6">
      <div className="relative z-10">
        <h2 className="text-md font-bold lg:text-xl">Welcome to app</h2>
        <p className="mt-1 text-xs text-gray-300 lg:mt-2 lg:text-sm">
          Hope you are having a fine day.
        </p>
        <p className="mt-1 text-xs text-gray-300 lg:mt-2 lg:text-sm">
          Thanks for downloading app
        </p>
      </div>
      {/* Abstract shapes */}
      <div className='absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#e74676] opacity-20 lg:h-32 lg:w-32'></div>
      <div className='absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-[#e74676] opacity-20 lg:h-20 lg:w-20'></div>
      <div className='absolute right-1/4 top-1/4 h-12 w-12 rounded-full bg-[#e74676] opacity-20 lg:h-16 lg:w-16'></div>
      <div className='absolute -right-2 top-1/2 h-20 w-52 -rotate-45 rounded-full bg-[#e74676] opacity-20 lg:h-24 lg:w-64'></div>
      <div className='absolute -left-2 bottom-1/4 h-16 w-40 rotate-45 rounded-full bg-[#e74676] opacity-20 lg:h-20 lg:w-48'></div>
    </div>
  );
};
