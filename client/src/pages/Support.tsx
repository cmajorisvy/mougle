import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500/20 text-blue-400",
  IN_PROGRESS: "bg-yellow-500/20 text-yellow-400",
  WAITING_USER: "bg-purple-500/20 text-purple-400",
  RESOLVED: "bg-green-500/20 text-green-400",
  CLOSED: "bg-gray-500/20 text-gray-400",
};

const CATEGORIES = ["general", "billing", "technical", "account", "feature_request", "bug_report"];

export default function Support() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"chat" | "tickets" | "new">("chat");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "Hi! I'm the Dig8opia support assistant. How can I help you today?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [newTicket, setNewTicket] = useState({ subject: "", description: "", category: "general", priority: "medium" });

  const { data: tickets = [] } = useQuery({ queryKey: ["/support/tickets"], queryFn: () => api.support.getTickets() });
  const { data: ticketMessages = [] } = useQuery({
    queryKey: ["/support/tickets", selectedTicket, "messages"],
    queryFn: () => api.support.getMessages(selectedTicket!),
    enabled: !!selectedTicket,
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: typeof newTicket) => api.support.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/support/tickets"] });
      setNewTicket({ subject: "", description: "", category: "general", priority: "medium" });
      setTab("tickets");
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => api.support.addMessage(id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/support/tickets", selectedTicket, "messages"] }),
  });

  const [replyInput, setReplyInput] = useState("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const { reply } = await api.support.chat(msg);
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again or create a support ticket." }]);
    }
    setChatLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b10", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1 data-testid="text-page-title" style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>Support Center</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>Get help from our AI assistant or create a support ticket</p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, justifyContent: "center" }}>
          {(["chat", "tickets", "new"] as const).map((t) => (
            <button
              key={t}
              data-testid={`button-tab-${t}`}
              onClick={() => { setTab(t); setSelectedTicket(null); }}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: tab === t ? "linear-gradient(135deg,#4f7df9,#8b5cf6)" : "#1a1d27",
                color: tab === t ? "#fff" : "#9ca3af",
              }}
            >
              {t === "chat" ? "Chat Assistant" : t === "tickets" ? "My Tickets" : "New Ticket"}
            </button>
          ))}
        </div>

        {tab === "chat" && (
          <div data-testid="section-chat" style={{ background: "#12141e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ height: 420, overflowY: "auto", padding: 20 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div
                    data-testid={`text-chat-message-${i}`}
                    style={{
                      maxWidth: "75%", padding: "12px 16px", borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                      background: m.role === "user" ? "#4f7df9" : "#1a1d27",
                      color: m.role === "user" ? "#fff" : "#e5e7eb",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                  <div style={{ background: "#1a1d27", padding: "12px 16px", borderRadius: 12, color: "#6b7280", fontSize: 13 }}>Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", gap: 8 }}>
              <input
                data-testid="input-chat"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                placeholder="Ask anything about Dig8opia..."
                style={{ flex: 1, background: "#0a0b10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e5e7eb", fontSize: 13 }}
              />
              <button
                data-testid="button-send-chat"
                onClick={handleChat}
                disabled={chatLoading}
                style={{ background: "linear-gradient(135deg,#4f7df9,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Send
              </button>
            </div>
            <div style={{ padding: "0 16px 12px", textAlign: "center" }}>
              <button
                data-testid="button-create-ticket-from-chat"
                onClick={() => setTab("new")}
                style={{ background: "none", border: "none", color: "#4f7df9", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                Can't find what you need? Create a support ticket
              </button>
            </div>
          </div>
        )}

        {tab === "tickets" && !selectedTicket && (
          <div data-testid="section-tickets">
            {tickets.length === 0 ? (
              <div style={{ background: "#12141e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 40, textAlign: "center" }}>
                <p style={{ color: "#6b7280", fontSize: 14 }}>No tickets yet. Use the chat assistant or create a new ticket.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tickets.map((t: any) => (
                  <button
                    key={t.id}
                    data-testid={`card-ticket-${t.id}`}
                    onClick={() => setSelectedTicket(t.id)}
                    style={{
                      background: "#12141e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px",
                      cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ color: "#e5e7eb", fontSize: 14, fontWeight: 600, margin: 0 }}>{t.subject}</p>
                      <p style={{ color: "#6b7280", fontSize: 11, margin: "4px 0 0" }}>#{t.id.slice(0, 8)} &middot; {t.category} &middot; {new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={STATUS_COLORS[t.status] || ""} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}>
                      {t.status.replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "tickets" && selectedTicket && (
          <div data-testid="section-ticket-detail">
            <button
              data-testid="button-back-tickets"
              onClick={() => setSelectedTicket(null)}
              style={{ background: "none", border: "none", color: "#4f7df9", fontSize: 13, cursor: "pointer", marginBottom: 16 }}
            >
              &larr; Back to tickets
            </button>
            <div style={{ background: "#12141e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ maxHeight: 400, overflowY: "auto", padding: 20 }}>
                {ticketMessages.map((m: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.senderType === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                    <div style={{
                      maxWidth: "75%", padding: "12px 16px", borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                      background: m.senderType === "user" ? "#4f7df9" : "#1a1d27",
                      color: "#e5e7eb",
                    }}>
                      <p style={{ color: "#9ca3af", fontSize: 10, margin: "0 0 4px" }}>{m.senderName}</p>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", gap: 8 }}>
                <input
                  data-testid="input-ticket-reply"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && replyInput.trim()) {
                      addMessageMutation.mutate({ id: selectedTicket, content: replyInput.trim() });
                      setReplyInput("");
                    }
                  }}
                  placeholder="Type your reply..."
                  style={{ flex: 1, background: "#0a0b10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e5e7eb", fontSize: 13 }}
                />
                <button
                  data-testid="button-send-reply"
                  onClick={() => {
                    if (replyInput.trim()) {
                      addMessageMutation.mutate({ id: selectedTicket, content: replyInput.trim() });
                      setReplyInput("");
                    }
                  }}
                  style={{ background: "linear-gradient(135deg,#4f7df9,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "new" && (
          <div data-testid="section-new-ticket" style={{ background: "#12141e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 28 }}>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 600, margin: "0 0 20px" }}>Create Support Ticket</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Subject</label>
                <input
                  data-testid="input-ticket-subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Brief summary of your issue"
                  style={{ width: "100%", background: "#0a0b10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e5e7eb", fontSize: 13 }}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Category</label>
                  <select
                    data-testid="select-ticket-category"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    style={{ width: "100%", background: "#0a0b10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e5e7eb", fontSize: 13 }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Priority</label>
                  <select
                    data-testid="select-ticket-priority"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    style={{ width: "100%", background: "#0a0b10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e5e7eb", fontSize: 13 }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Description</label>
                <textarea
                  data-testid="input-ticket-description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Describe your issue in detail..."
                  rows={5}
                  style={{ width: "100%", background: "#0a0b10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e5e7eb", fontSize: 13, resize: "vertical" }}
                />
              </div>
              <button
                data-testid="button-submit-ticket"
                onClick={() => {
                  if (newTicket.subject && newTicket.description) createTicketMutation.mutate(newTicket);
                }}
                disabled={createTicketMutation.isPending || !newTicket.subject || !newTicket.description}
                style={{
                  background: "linear-gradient(135deg,#4f7df9,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px 28px", fontWeight: 600, fontSize: 14, cursor: "pointer", alignSelf: "flex-start",
                  opacity: (!newTicket.subject || !newTicket.description) ? 0.5 : 1,
                }}
              >
                {createTicketMutation.isPending ? "Creating..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
