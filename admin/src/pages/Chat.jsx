import React from 'react';

const CHATBOT_URL = 'http://localhost:5055/embed/e97fb99d-7a25-478b-8df1-23945cc3c587';

export default function Chat() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>AI Chatbot</h1>
          <p style={s.sub}>Embedded assistant powered by your bot service</p>
        </div>
      </div>

      <div style={s.frameWrap}>
        <iframe
          src={CHATBOT_URL}
          title="AI Chatbot"
          style={s.frame}
          allow="microphone; camera"
        />
      </div>
    </div>
  );
}

const s = {
  page: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    gap: '16px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  title: { fontSize: 22, fontWeight: 800, color: '#1E1B4B', margin: 0 },
  sub:   { fontSize: 13, color: '#6B7280', marginTop: 4 },
  frameWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #E5E7EB',
    background: '#fff',
  },
  frame: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  },
};
