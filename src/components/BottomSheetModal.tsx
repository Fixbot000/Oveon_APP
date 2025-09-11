import React from 'react';
import { X, Clock } from 'lucide-react';
import { type Tip, getDifficultyColor } from '@/lib/tipsGenerator';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tip: Tip | null;
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({ isOpen, onClose, tip }) => {
  if (!isOpen || !tip) return null;

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-10">
          <h3 className="text-2xl font-bold mb-2 text-foreground">{tip.title}</h3>
          <p className="text-muted-foreground text-base mb-4">{tip.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className={`px-3 py-1 rounded-full text-white ${getDifficultyColor(tip.difficulty)}`}>
              {tip.difficulty}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{tip.readTime}</span>
            </div>
          </div>

          <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {tip.fullDescription}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BottomSheetModal;
