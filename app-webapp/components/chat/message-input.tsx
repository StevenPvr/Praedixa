"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@praedixa/ui";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  sending: boolean;
}

const MAX_CHARS = 5000;

export function MessageInput({ onSend, disabled, sending }: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = content.trim();
  const canSend =
    trimmed.length > 0 && trimmed.length <= MAX_CHARS && !disabled && !sending;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(trimmed);
    setContent("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, onSend, trimmed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      // Auto-resize textarea
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    },
    [],
  );

  return (
    <div className="border-t border-neutral-200/80 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            disabled ? "Conversation fermee" : "Ecrivez votre message..."
          }
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-neutral-200 bg-gray-50 px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 outline-none transition-colors",
            "focus:border-amber-300 focus:bg-white focus:ring-1 focus:ring-amber-200",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label="Saisir un message"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            canSend
              ? "bg-amber-300 text-charcoal hover:bg-amber-200"
              : "bg-gray-100 text-gray-300",
          )}
          aria-label="Envoyer"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {content.length > MAX_CHARS && (
        <p className="mt-1 text-xs text-red-500">
          {content.length} / {MAX_CHARS} caracteres maximum
        </p>
      )}
    </div>
  );
}
