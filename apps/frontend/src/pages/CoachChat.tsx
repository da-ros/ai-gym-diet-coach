import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { sendChat, getDailySummary, buildMpsTimelineSummary } from "@/lib/api";

interface Message {
  role: "coach" | "user";
  text: string;
}

/** Renders coach reply with **bold** as <strong>. Split on literal "**", odd segments are bold. */
function ChatMessageMarkdown({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </span>
  );
}

const CHAT_STORAGE_KEY = "coach-chat";

function todayKey() {
  return `${CHAT_STORAGE_KEY}-${new Date().toISOString().slice(0, 10)}`;
}

function loadChatForToday(): Message[] {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChatForToday(messages: Message[]) {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(messages));
  } catch {
    // ignore quota / private mode
  }
}

const quickPrompts = ["How am I doing?", "What to eat next?", "Pre-workout meal?", "Hit my protein?"];

const CoachChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(() => loadChatForToday());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<{ protein: number; mps: string } | null>(null);
  const [dailySummary, setDailySummary] = useState<Awaited<ReturnType<typeof getDailySummary>> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDailySummary()
      .then((d) => {
        setContext({ protein: Math.round(d.total_protein_g), mps: d.mps_score.label });
        setDailySummary(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    saveChatForToday(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    saveChatForToday([]);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timelineSummary = buildMpsTimelineSummary(dailySummary);
      const data = await sendChat(text, tz, messages, timelineSummary);
      setMessages((prev) => [...prev, { role: "coach", text: data.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "coach", text: `Error: ${e.message ?? "Something went wrong."}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-display">Coach</h1>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
        {context && (
          <div className="glass-card-solid px-4 py-2 text-xs text-muted-foreground">
            Today:{" "}
            <span className="font-bold text-foreground">{context.protein}g protein</span> |{" "}
            <span className="font-bold text-foreground">{context.mps}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 space-y-3 py-3">
        {messages.length === 0 && (
          <div className="glass-card-solid p-6 text-center">
            <p className="text-3xl mb-2">🏋️</p>
            <p className="text-sm font-medium text-foreground">Your AI coach is ready.</p>
            <p className="text-xs text-muted-foreground mt-1">
              All answers are based on your logged meals today.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "glass-card-solid rounded-bl-md"
              }`}
            >
              {msg.role === "coach" ? (
                <ChatMessageMarkdown text={msg.text} />
              ) : (
                msg.text
              )}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="glass-card-solid px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts — always visible for one-tap shortcuts */}
      <div className="px-5 pb-2 flex gap-2 overflow-x-auto">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => send(prompt)}
            disabled={loading}
            className="whitespace-nowrap px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground hover:bg-accent active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 pb-3">
        <div className="flex gap-2 items-center glass-card-solid px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachChat;
