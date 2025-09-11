import React from 'react';
import { X } from 'lucide-react';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  isOpen, onClose, children, title
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
      />

      {/* Bottom Sheet Content */}
      <div
        className={`relative w-full max-w-md bg-white rounded-t-3xl shadow-lg flex flex-col
                    transform transition-transform duration-300 ease-out pointer-events-auto
                    ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: '70vh' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Title */}
        <div className="py-4 px-6 border-b border-gray-200 text-center">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheetModal;
