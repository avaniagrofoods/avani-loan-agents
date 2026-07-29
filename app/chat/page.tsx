'use client';

import { useChat } from 'ai/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  ArrowLeft, 
  MessageSquare, 
  HelpCircle, 
  ShieldCheck, 
  MapPin, 
  Calculator,
  Compass,
  GraduationCap
} from 'lucide-react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages, append } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hello! Welcome to **AVANI LOAN SERVICES** AI Advisory Portal. 

I can assist you with:
1. **Checking loan eligibility** (Personal, Business, Doctor, Home, Mortgage, or Education Loans).
2. **Generating customized document checklists** for your loan application.
3. **Calculating monthly EMIs** based on amount, rate, and tenure.

To begin, please tell me your name and what loan product you are interested in today!`
      }
    ]
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Read parameters from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const amount = params.get('amount');
      const type = params.get('type');
      if (amount && type) {
        // Pre-seed conversation with calculator details
        const formattedAmount = Number(amount).toLocaleString('en-IN');
        append({
          role: 'user',
          content: `Hi, I just calculated my EMI on the homepage for a ${type} of ₹${formattedAmount}. Can you help me check my eligibility and qualifications?`
        });
      }
    }
  }, []);

  // Click suggestions helper
  const handleSuggestionClick = (text: string) => {
    append({
      role: 'user',
      content: text
    });
  };

  return (
    <div className="min-h-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="header-glass">
        <div className="logo-container">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)', marginRight: '1rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <div className="logo-text">AVANI <span>AI ADVISOR</span></div>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', listStyle: 'none', fontWeight: 500 }}>
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/chat" className="nav-link active">AI Advisor</Link>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
        </nav>
      </header>

      {/* Main Chat Interface Layout */}
      <div className="chat-container">
        
        {/* Sidebar */}
        <aside className="chat-sidebar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div className="chat-avatar-status">
                A
                <span className="status-indicator"></span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--primary-color)' }}>Loan Advisor Agent</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>ONLINE & READY</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                💡 Quick Inquiries
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleSuggestionClick("I want to check my Personal Loan eligibility.")}
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.6rem 1rem', width: '100%', textAlign: 'left' }}
                >
                  <Compass size={14} /> Check Personal Loan
                </button>
                <button 
                  onClick={() => handleSuggestionClick("What documents do I need for a Business Loan?")}
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.6rem 1rem', width: '100%', textAlign: 'left' }}
                >
                  <HelpCircle size={14} /> Business Loan Documents
                </button>
                <button 
                  onClick={() => handleSuggestionClick("Calculate EMI for a Home Loan of 30 Lakhs at 8.5% interest for 15 years.")}
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.6rem 1rem', width: '100%', textAlign: 'left' }}
                >
                  <Calculator size={14} /> Calculate Home Loan EMI
                </button>
                <button 
                  onClick={() => handleSuggestionClick("Tell me about global education funding options.")}
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.6rem 1rem', width: '100%', textAlign: 'left' }}
                >
                  <GraduationCap size={14} /> Global Education Loans
                </button>
              </div>
            </div>
          </div>

          {/* Secure Trust Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--primary-color)' }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>SECURE & PRIVATE</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', lineHeight: 1.4 }}>
              Your details are stored securely and directly routed to founder Sachin Shinde for official evaluation.
            </p>
          </div>
        </aside>

        {/* Chat Main Window */}
        <main className="chat-main">
          
          {/* Main message viewport */}
          <div className="chat-messages">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className="message-bubble"
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: m.role === 'user' ? 'var(--primary-color)' : 'var(--white)',
                  color: m.role === 'user' ? 'var(--white)' : 'var(--text-dark)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  borderBottomRightRadius: m.role === 'user' ? '2px' : 'var(--border-radius-md)',
                  borderBottomLeftRadius: m.role === 'user' ? 'var(--border-radius-md)' : '2px',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {/* Clean parser helper for simple bold/bullet formatting */}
                  {parseMarkdown(m.content)}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-bubble" style={{ alignSelf: 'flex-start', backgroundColor: 'var(--white)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem 0.5rem' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: '0.5rem' }}>Agent is typing...</span>
                </div>
              </div>
            )}

            {/* Error handling banner */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                margin: '1rem 0',
                alignSelf: 'center',
                maxWidth: '80%',
                textAlign: 'center'
              }}>
                <strong>Notice:</strong> Connecting to AI Advisory server... Please try asking your question again.
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input form */}
          <div className="chat-input-area">
            <form onSubmit={handleSubmit} className="chat-form">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about loans, documents, calculate EMI, or submit your details..."
                className="chat-input"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading || !input.trim()}
              >
                <Send size={16} /> Send
              </button>
            </form>
          </div>

        </main>
      </div>
    </div>
  );
}

// Simple helper to parse bold text (**word**) and list indicators (e.g. 1., *, -) in chat bubble rendering
function parseMarkdown(text: string) {
  if (!text) return '';
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let content: React.ReactNode = line;
    
    // Bold replacement (**text**)
    if (line.includes('**')) {
      const parts = line.split('**');
      content = parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'inherit', fontWeight: 700 }}>{part}</strong> : part);
    }
    
    // Simple list spacing check
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
    const isNumbered = /^\d+\.\s/.test(line.trim());
    
    return (
      <div 
        key={idx} 
        style={{ 
          marginBottom: line.trim() === '' ? '0.5rem' : '0.25rem',
          paddingLeft: isBullet || isNumbered ? '1.25rem' : '0',
          textIndent: isBullet || isNumbered ? '-1.25rem' : '0'
        }}
      >
        {content}
      </div>
    );
  });
}
