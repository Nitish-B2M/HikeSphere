import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-auto',
            'bg-white rounded-2xl shadow-2xl p-6',
            'focus:outline-none',
            className
          )}
        >
          {title && <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>}
          {description && <Dialog.Description className="mt-1 text-sm text-gray-600">{description}</Dialog.Description>}
          <Dialog.Close
            className="absolute top-4 right-4 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>
          <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
