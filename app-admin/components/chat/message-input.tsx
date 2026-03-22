"use client";

import { useCallback, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@praedixa/ui";
import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

const MAX_CHARS = 5000;

type MessageInputProps = Readonly<{
  conversationId: string;
  disabled?: boolean;
  onSend: () => void;
}>;

export function MessageInput({
  conversationId,
  disabled = false,
  onSend,
}: MessageInputProps) {
  const [content, setContent] = useState("");

  const { mutate, loading } = useApiPost<{ content: string }, unknown>(
    ADMIN_ENDPOINTS.conversationMessages(conversationId),
  );

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    const canSend = trimmed.length > 0 && trimmed.length <= MAX_CHARS;
    if (canSend) {
      const result = await mutate({ content: trimmed });
      if (result !== null) {
        setContent("");
        onSend();
      }
    }
  }, [content, mutate, onSend]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && e.shiftKey === false) {
      e.preventDefault();
      handleSend().catch(() => undefined);
    }
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = content.trim().length === 0;

  return (
    <div className="border-t border-border-subtle px-4 py-3">
      {disabled ? (
        <p className="text-center text-sm text-ink-placeholder">
          Cette conversation est fermee. Vous ne pouvez plus envoyer de
          messages.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ecrire un message..."
              rows={2}
              className="flex-1 resize-none rounded-xl border border-border-subtle bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-placeholder focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={loading}
              aria-label="Message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={loading || isEmpty || isOverLimit}
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-ink-placeholder">
              Maj+Entree pour un retour a la ligne
            </span>
            <span
              className={
                isOverLimit
                  ? "text-danger-600 font-medium"
                  : "text-ink-placeholder"
              }
            >
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export type { MessageInputProps };
export { MAX_CHARS };
