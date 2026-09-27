import React from 'react';
import ChatWindow from '../components/ChatWindow';
import MemoryPanel from '../components/MemoryPanel';

export default function ChatPage() {
  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      <ChatWindow />
      <MemoryPanel />
    </div>
  );
}
