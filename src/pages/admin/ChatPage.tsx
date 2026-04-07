import { useState, useEffect, useRef } from 'react';
import { getChatSessions, getChatMessages, sendChatMessage, type ChatSession, type AdminChatMessage } from '../../adminApi';
import { useAdmin } from '../../AdminApp';

export function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const { showToast } = useAdmin();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000); // Poll sessions every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
      const interval = setInterval(() => loadMessages(selectedUserId), 5000); // Poll messages every 5s
      return () => clearInterval(interval);
    }
  }, [selectedUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadSessions() {
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load chat sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadMessages(userId: string) {
    try {
      const data = await getChatMessages(userId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages', err);
    } 
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendChatMessage(selectedUserId, newMessage.trim());
      setNewMessage('');
      await loadMessages(selectedUserId);
      loadSessions(); // Refresh list to update timing
    } catch (err: any) {
      showToast('error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-view__sessions">
        <div className="chat-view__sessions-header">
          Sessions
        </div>
        <div className="chat-view__sessions-list">
          {loadingSessions && sessions.length === 0 ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">No chat sessions</div>
          ) : sessions.map(session => (
            <div 
              key={session.user_id}
              className={`chat-session-item ${selectedUserId === session.user_id ? 'chat-session-item--active' : ''}`}
              onClick={() => setSelectedUserId(session.user_id)}
            >
              <div className="chat-session-item__avatar">
                {(session.first_name || session.user_id)[0].toUpperCase()}
              </div>
              <div className="chat-session-item__info">
                <div className="chat-session-item__name">{session.first_name || session.user_id}</div>
                <div className="chat-session-item__sub">
                  {session.username ? `@${session.username}` : `ID: ${session.user_id}`}
                </div>
              </div>
              <div className="chat-session-item__time">
                {new Date(session.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-view__main">
        {selectedUserId ? (
          <>
            <div className="chat-view__main-header">
              Chatting with {sessions.find(s => s.user_id === selectedUserId)?.first_name || selectedUserId}
            </div>
            <div className="chat-view__messages">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`chat-msg ${msg.is_admin ? 'chat-msg--admin' : 'chat-msg--user'}`}
                >
                  <div className="chat-msg__bubble">
                    {msg.message}
                    <div className="chat-msg__time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-view__input" onSubmit={handleSend}>
              <input 
                className="form-input" 
                placeholder="Type your reply..." 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                autoFocus
              />
              <button 
                className="btn btn--primary" 
                type="submit" 
                disabled={!newMessage.trim() || sending}
              >
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-view__placeholder">
            <div className="chat-view__placeholder-icon">💬</div>
            <div>Select a session to start chatting</div>
          </div>
        )}
      </div>
    </div>
  );
}
