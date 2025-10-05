import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  FileText, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  BookOpen,
  Globe
} from 'lucide-react';

interface Document {
  title: string;
  link: string;
}

interface ReferenceDocumentsProps {
  theme: any;
  sourceDocuments?: number;
}

export function ReferenceDocuments({ theme, sourceDocuments = 0 }: ReferenceDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch('/SB_publication_PMC.csv');
        if (!response.ok) {
          throw new Error(`Failed to load documents: ${response.status}`);
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        // Skip header row and parse CSV
        const documentData: Document[] = lines.slice(1).map(line => {
          const [title, link] = line.split(',').map(item => item.trim().replace(/"/g, ''));
          return { title, link };
        }).filter(doc => doc.title && doc.link);
        
        setDocuments(documentData);
        setError(null);
      } catch (err) {
        console.error('Error loading reference documents:', err);
        setError('Failed to load reference documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const displayedDocuments = isExpanded ? documents : documents.slice(0, 5);

  if (loading) {
    return (
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-400 animate-pulse" />
            <p className="text-gray-400">Loading reference documents...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader className={`bg-gradient-to-r ${theme.primary} bg-opacity-20`}>
        <CardTitle className="text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Reference Documents
          <Badge className="bg-white/20 text-white ml-2">
            {documents.length} papers
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4">
          <p className="text-gray-300 text-sm mb-4">
            Based on the analysis above, here are the relevant research papers and documents that informed the findings:
          </p>
          
          <div className="space-y-3">
            {displayedDocuments.map((doc, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors duration-200"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium mb-1 overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400 truncate">
                        {(() => {
                          try {
                            return new URL(doc.link).hostname;
                          } catch {
                            return 'External Link';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 p-2 h-auto"
                    onClick={() => {
                      try {
                        window.open(doc.link, '_blank', 'noopener,noreferrer');
                      } catch (error) {
                        console.error('Error opening link:', error);
                      }
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {documents.length > 5 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show All {documents.length} Documents
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 text-center">
            💡 Click the external link icon to visit the full research paper
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
