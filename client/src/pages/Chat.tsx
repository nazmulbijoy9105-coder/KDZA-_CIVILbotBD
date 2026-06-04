import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

interface ChatMessage {
  id?: number;
  content: string;
  role: "user" | "assistant";
  createdAt?: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const getHistoryQuery = trpc.chat.getHistory.useQuery({});

  // Load chat history on mount
  useEffect(() => {
    if (getHistoryQuery.data?.messages) {
      setMessages(
        getHistoryQuery.data.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role as "user" | "assistant",
          createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
        }))
      );
    }
  }, [getHistoryQuery.data]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to UI
    const userMessage: ChatMessage = {
      content: input,
      role: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await sendMessageMutation.mutateAsync({ message: input });

      if (result.success) {
        const assistantMessage: ChatMessage = {
          content: result.message,
          role: "assistant",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          content: result.message || "An error occurred. Please try again.",
          role: "assistant",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        role: "assistant",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">KDZA Legal Bot</h1>
            <p className="text-xs text-slate-400 font-mono">
              Bangladesh Civil Dispute Engine
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-medium">{user?.name || "User"}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-slate-600 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-200px)] flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-6xl">⚖️</div>
                <h2 className="text-2xl font-bold">Start Your Legal Analysis</h2>
                <p className="text-slate-400 max-w-md">
                  Describe your civil dispute in detail. Include information about the parties,
                  property, documents, and relief sought. Our AI will extract the facts and run
                  them through the 14-stage Bangladesh Civil Dispute Engine.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-2xl p-4 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-slate-800 text-slate-100 border-slate-700"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert max-w-none text-sm">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.createdAt && (
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  )}
                </Card>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-slate-800 border-slate-700 p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm text-slate-300">Analyzing your dispute...</p>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Legal Disclaimer */}
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
          <p className="text-xs text-amber-100">
            <strong>⚠️ Legal Disclaimer:</strong> This is for legal literacy only, not legal
            advice. For actual legal advice, consult with a Bangladesh Bar Council enrolled
            advocate.
          </p>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleSendMessage();
                }
              }}
              placeholder="Describe your civil dispute... (Ctrl+Enter to send)"
              className="flex-1 bg-slate-800 border-slate-600 text-white placeholder-slate-500 resize-none"
              rows={4}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white h-auto"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Bilingual Labels & Help Text */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
              <p className="font-mono text-slate-400">বিবাদের ধরন</p>
              <p className="text-slate-300">Dispute Type</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
              <p className="font-mono text-slate-400">প্রার্থিত প্রতিকার</p>
              <p className="text-slate-300">Relief Sought</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
              <p className="font-mono text-slate-400">দাবির পরিমাণ</p>
              <p className="text-slate-300">Claim Amount</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
              <p className="font-mono text-slate-400">আইনি সীমাবদ্ধতা</p>
              <p className="text-slate-300">Limitation</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
