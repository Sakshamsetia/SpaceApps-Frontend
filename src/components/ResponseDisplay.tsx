import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { 
  FileText, 
  Image, 
  Brain,
  AlertCircle,
  TrendingUp,
  Map,
  Send,
  Loader2,
  Bot,
  User,
  Zap,
  X
} from 'lucide-react';
import { api } from '../utils/api';
import { ReferenceDocuments } from './ReferenceDocuments';

interface Paragraph {
  title: string;
  text: string;
  images: string[];
  tables: string[];
}

interface ResponseData {
  paragraphs: Paragraph[];
  overallTitle?: string;
  metadata: {
    total_paragraphs: number;
    total_images: string[];
    total_tables: string[];
    source_documents: number;
    user_type: string;
  };
  userType: string;
}

interface ResponseDisplayProps {
  response: ResponseData;
  theme: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function AnimatedSection({ children, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

export function ResponseDisplay({ response, theme }: ResponseDisplayProps) {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [tableContents, setTableContents] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadImageMap = async () => {
      try {
        const response = await fetch('/images.json');
        if (!response.ok) throw new Error(`Failed to load images.json: ${response.status}`);
        const data = await response.json();
        setImageMap(data);
      } catch (error) {
        console.error('Error loading images.json:', error);
      } finally {
        setLoadingImages(false);
      }
    };
    loadImageMap();
  }, []);

  useEffect(() => {
    const loadTables = async () => {
      if (!response?.metadata?.total_tables || response.metadata.total_tables.length === 0) {
        setLoadingTables(false);
        return;
      }

      const tableData: Record<string, string> = {};
      for (const tableId of response.metadata.total_tables) {
        try {
          const tableResponse = await fetch(`/tables_data/${tableId}.html`);
          if (tableResponse.ok) {
            const html = await tableResponse.text();
            tableData[tableId] = html;
          }
        } catch (error) {
          console.error(`Error loading table ${tableId}:`, error);
        }
      }
      setTableContents(tableData);
      setLoadingTables(false);
    };
    loadTables();
  }, [response?.metadata?.total_tables]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Create context from the current response
      const contextText = response.paragraphs.map(p => `${p.title}: ${p.text}`).join('\n\n');
      
      // Create a streaming AI response
      let aiResponse = '';
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);

      await api.streamChat(
        {
          question: currentInput,
          context: contextText,
          userType: response.userType || 'scientist'
        },
        (event) => {
          if (event.type === 'text' && event.content) {
            aiResponse += event.content;
            setChatMessages(prev => 
              prev.map((msg, idx) => 
                idx === prev.length - 1 
                  ? { ...msg, content: aiResponse.trim() }
                  : msg
              )
            );
          } else if (event.type === 'error') {
            setChatMessages(prev => 
              prev.map((msg, idx) => 
                idx === prev.length - 1 
                  ? { ...msg, content: `Sorry, I encountered an error: ${event.content}` }
                  : msg
              )
            );
          } else if (event.type === 'done') {
            setIsChatLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I couldn't process your question. Please try again.`,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      setIsChatLoading(false);
    }
  };

  if (!response || !response.paragraphs || response.paragraphs.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">No response data available</p>
        </CardContent>
      </Card>
    );
  }

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'scientist': return <Brain className="w-5 h-5" />;
      case 'investor': return <TrendingUp className="w-5 h-5" />;
      case 'mission-architect': return <Map className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'scientist': return 'Scientific Analysis';
      case 'investor': return 'Investment Analysis';
      case 'mission-architect': return 'Mission Architecture';
      default: return 'Analysis';
    }
  };

  // Query always shown on top
  const queryText = (response?.metadata as any)?.query || '';

  return (
    <div className="space-y-6">
      {/* Query Display */}
      {queryText && (
        <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border-white/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium text-lg">{queryText}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Title Section */}
      {response.overallTitle && (
        <AnimatedSection>
          <Card className={`bg-gradient-to-r ${theme.primary} backdrop-blur-sm border-white/20`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                {getUserTypeIcon(response.userType)}
                <h2 className="text-2xl font-bold text-white flex-1">{response.overallTitle}</h2>
                <Badge className="bg-white/20 text-white">{getUserTypeLabel(response.userType)}</Badge>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      )}

     

      {/* Paragraphs Section */}
      {response.paragraphs.map((paragraph, idx) => (
        <div key={idx} className="flex gap-6 items-start mb-6">
          {/* Text on left, images/tables on right */}
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-2">{paragraph.title}</h3>
            <p className="text-gray-300 mb-2">{paragraph.text}</p>
            {/* Tables */}
            {paragraph.tables && paragraph.tables.length > 0 && (
              <div className="space-y-2">
                {paragraph.tables.map((tableId, tblIdx) => (
                  <div key={tblIdx} className="bg-green-50 rounded-lg p-2 mb-2">
                    <span className="font-semibold text-green-900">📊 Table:</span>
                    <div dangerouslySetInnerHTML={{ __html: tableContents[tableId] || `<span class="text-gray-400">Table not found</span>` }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Images on right */}
          <div className="flex flex-col gap-3 items-end min-w-[400px] max-w-[600px]">
            {paragraph.images && paragraph.images.length > 0 && (
              paragraph.images.map((imageId, imgIdx) => (
                <img
                  key={imgIdx}
                  src={imageMap[imageId]}
                  alt={`Image ${imageId}`}
                  className="rounded-lg shadow-lg object-contain cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105"
                  style={{ 
                    width: 'auto', 
                    height: '200px',
                    maxWidth: '100%'
                  }}
                  onClick={() => setSelectedImage(imageMap[imageId])}
                />
              ))
            )}
          </div>
        </div>
      ))}

      {/* Reference Documents Section */}
      <AnimatedSection delay={0.2}>
        <ReferenceDocuments 
          theme={theme} 
          sourceDocuments={response.metadata?.source_documents || 0} 
        />
      </AnimatedSection>

      {/* Chat Interface Section */}
      <AnimatedSection delay={0.3}>
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className={`bg-gradient-to-r ${theme.primary} bg-opacity-20`}>
            <CardTitle className="text-white flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Doubt Bot - Ask Questions About This Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Chat Messages */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Ask me anything about the analysis above</p>
                  <p className="text-sm mt-2">I can help clarify findings, explain methodologies, or discuss implications</p>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>💡 Try asking:</p>
                    <p>"What does this data mean?" • "Can you explain this concept?" • "What are the implications?"</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className={`p-2 bg-gradient-to-r ${theme.primary} rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0`}>
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[70%] p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-500/20 text-white' 
                        : 'bg-white/10 text-gray-300'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="p-2 bg-blue-500/20 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              {isChatLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className={`p-2 bg-gradient-to-r ${theme.primary} rounded-full h-8 w-8 flex items-center justify-center`}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg">
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  placeholder="Ask a question about this analysis... (e.g., 'What does this mean?', 'Can you explain this further?')"
                  className="min-h-[60px] bg-white/5 border-white/20 text-white placeholder:text-gray-400 resize-none flex-1"
                />
                <Button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isChatLoading}
                  className={`bg-gradient-to-r ${theme.primary} hover:opacity-90 self-end`}
                >
                  {isChatLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      {/* Image Modal */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Full size image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}