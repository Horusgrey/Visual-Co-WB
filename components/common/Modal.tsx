import React, { useEffect, useRef } from 'react';
import Icon from './Icon';
import Tooltip from './Tooltip';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-brand-dark-accent border border-brand-purple/20 rounded-xl shadow-lg w-full max-w-md m-4 p-6 text-brand-light"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 id="modal-title" className="text-2xl font-bold">{title}</h2>
            <Tooltip text="Close (Esc)">
              <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close modal"
              >
                  <Icon name="close" className="w-6 h-6" />
              </button>
            </Tooltip>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
