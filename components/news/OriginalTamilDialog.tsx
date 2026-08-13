'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Languages } from 'lucide-react';

interface OriginalTamilDialogProps {
  originalTitle: string;
  originalContent: string | null;
}

export function OriginalTamilDialog({ originalTitle, originalContent }: OriginalTamilDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium text-slate-300 transition-colors">
          <Languages className="w-4 h-4" />
          View Original Tamil
        </button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-white/10 shadow-2xl rounded-xl z-50 flex flex-col animate-in zoom-in-95">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <Dialog.Title className="text-lg font-semibold text-white flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-400" />
              Original Tamil Article
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-200 mb-6 leading-snug">
              {originalTitle}
            </h2>
            
            <div className="prose prose-invert prose-slate max-w-none">
              {originalContent ? (
                originalContent.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-slate-300 leading-relaxed text-base md:text-lg mb-4">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-slate-400 italic">Content not available in Tamil.</p>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
