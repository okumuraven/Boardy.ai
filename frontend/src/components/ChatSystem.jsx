import { useState, useEffect, useRef } from "react";

export default function ChatRoomView({ roomId, profile, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    console.log(`Connected to room ${roomId}`);
    
    // Simulate an initial history load with a business context
    setTimeout(() => {
      setMessages([
        { 
          id: 1, 
          type: "system",
          content: "Identity Verified via Avalanche Civic Pass. Both parties have staked 0.01 AVAX.", 
          inserted_at: new Date().toISOString() 
        },
        { 
          id: 2, 
          type: "text",
          content: "Hello! I saw your project needs a Web3 developer. I'm ready to collaborate.", 
          sender_id: "mock_other_user", 
          inserted_at: new Date().toISOString() 
        }
      ]);
    }, 1000);
    
    return () => console.log("Left room");
  }, [roomId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      id: Date.now(),
      type: "text",
      content: newMessage,
      sender_id: profile?.id || 1,
      inserted_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, msg]);
    setNewMessage("");

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: "text",
        content: "That sounds great. Let's set up an Escrow Milestone for the first deliverable.",
        sender_id: "mock_other_user",
        inserted_at: new Date().toISOString()
      }]);
    }, 2000);
  };

  const handleCreateMilestone = () => {
    const msg = {
      id: Date.now(),
      type: "escrow_proposal",
      content: "Proposed Escrow: 50 AVAX for MVP Delivery",
      sender_id: profile?.id || 1,
      inserted_at: new Date().toISOString(),
      amount: "50 AVAX"
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleVerifyIdentity = () => {
    const msg = {
      id: Date.now(),
      type: "identity_verification",
      content: "Identity Document Shared securely.",
      sender_id: profile?.id || 1,
      inserted_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleCall = (type) => {
    alert(`Initiating secure end-to-end encrypted ${type} call...`);
  };

  return (
    <div className="glass-card animate-in" style={{ maxWidth: '900px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', marginRight: '1rem' }}
          >
            ←
          </button>
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-main)' }}>Professional Match #{roomId}</h2>
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              Escrow Secured on Avalanche
            </span>
          </div>
        </div>

        {/* Action Buttons (Call / Video) */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => handleCall('Voice')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📞 Voice Call
          </button>
          <button onClick={() => handleCall('Video')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📹 Video Call
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>👋 Professional Synergy Established</p>
            <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              You are now securely connected. Use the tools below to share identity, discuss terms, and create smart-contract milestones.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id || i} style={{ textAlign: 'center', margin: '1rem 0' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    🛡️ {msg.content}
                  </span>
                </div>
              );
            }

            const isMe = msg.sender_id === (profile?.id || 1);
            
            return (
              <div key={msg.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                <div style={{ 
                  background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                  color: 'white',
                  padding: '1rem', 
                  borderRadius: '16px',
                  borderBottomRightRadius: isMe ? '4px' : '16px',
                  borderBottomLeftRadius: isMe ? '16px' : '4px',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  {msg.type === "escrow_proposal" && (
                    <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      💼 Escrow Milestone Created
                    </div>
                  )}
                  {msg.type === "identity_verification" && (
                    <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}>
                      🆔 Identity Reveal
                    </div>
                  )}
                  
                  {msg.content}
                  
                  {msg.type === "escrow_proposal" && !isMe && (
                    <button style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: 'white', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Fund {msg.amount} into Smart Contract
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.inserted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Business Tool Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={handleVerifyIdentity} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          📷 Reveal Identity
        </button>
        <button onClick={handleCreateMilestone} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#f59e0b', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          💰 Create Escrow Milestone
        </button>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Discuss project terms, deliverables..."
          style={{ 
            flex: 1, 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px',
            padding: '1rem',
            color: 'white',
            outline: 'none',
            fontSize: '0.95rem'
          }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem', height: '100%', borderRadius: '12px' }} disabled={!newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
