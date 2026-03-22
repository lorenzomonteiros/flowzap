import { useEffect, useState } from 'react';
import { MessageSquare, Send, Search, ArrowRight } from 'lucide-react';
import api from '../lib/axios.ts';
import { useToast } from '../hooks/useToast.ts';
import type { Message, Contact } from '../types/index.ts';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Skeleton } from '../components/ui/Skeleton.tsx';
import { formatRelativeTime, formatPhone, cn } from '../lib/utils.ts';

interface Conversation extends Contact {
  messages: Message[];
}

export function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendText, setSendText] = useState('');
  const toast = useToast();

  useEffect(() => {
    api
      .get<{ success: boolean; data: Conversation[] }>('/messages/conversations')
      .then((r) => setConversations(r.data.data || []))
      .catch(() => toast.error('Erro ao carregar conversas'))
      .finally(() => setIsLoading(false));
  }, []);

  const loadMessages = async (contact: Conversation) => {
    setSelectedConv(contact);
    setMessagesLoading(true);
    try {
      const r = await api.get<{ success: boolean; data: Message[] }>(
        `/messages/contact/${contact.id}`
      );
      setMessages(r.data.data || []);
    } catch {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setMessagesLoading(false);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="flex h-full animate-fade-in">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gold-muted flex flex-col bg-bg-secondary">
        <div className="p-4 border-b border-gold-muted">
          <h1 className="font-heading text-xl font-bold text-text-primary mb-3">Conversas</h1>
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={32} className="mx-auto mb-2 text-text-muted" />
              <p className="text-text-secondary text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadMessages(conv)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-gold-muted/50 text-left',
                  selectedConv?.id === conv.id
                    ? 'bg-gold/10'
                    : 'hover:bg-bg-tertiary'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold flex-shrink-0">
                  {(conv.name || conv.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {conv.name || formatPhone(conv.phone)}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {conv.messages[0]
                      ? (conv.messages[0].content as { text?: string }).text || '...'
                      : 'Sem mensagens'}
                  </p>
                </div>
                {conv.messages[0] && (
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {formatRelativeTime(conv.messages[0].createdAt)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col bg-bg-primary">
        {selectedConv ? (
          <>
            <div className="flex items-center gap-3 px-6 py-4 bg-bg-secondary border-b border-gold-muted">
              <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold">
                {(selectedConv.name || selectedConv.phone).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {selectedConv.name || formatPhone(selectedConv.phone)}
                </p>
                <p className="text-xs text-text-secondary">{formatPhone(selectedConv.phone)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-text-muted text-sm">Carregando...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-text-secondary text-sm">Nenhuma mensagem</p>
                  </div>
                </div>
              ) : (
                messages.slice().reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-xs px-4 py-2 rounded-2xl text-sm',
                        msg.direction === 'outbound'
                          ? 'bg-gold/20 text-text-primary rounded-br-sm'
                          : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
                      )}
                    >
                      <p>{(msg.content as { text?: string }).text || '...'}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {msg.sentAt ? formatRelativeTime(msg.sentAt) : formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-text-muted" />
              <h3 className="font-heading text-lg text-text-primary mb-2">Selecione uma conversa</h3>
              <p className="text-text-secondary text-sm">
                Escolha um contato na lista para ver as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
