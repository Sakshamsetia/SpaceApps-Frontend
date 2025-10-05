import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LoadingAnimation } from './LoadingAnimation';
import { DocBox, PaperProps } from './DocBox';
import toast, { Toaster } from 'react-hot-toast';

import {
  Search,
  Filter,
  Star,
  Download,
  Eye,
  Calendar,
  Users,
  Sparkles,
  ExternalLink,
  FileText,
  Database,
  Clock,
  Tag,
  BellRing
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import papersData from '../utils/papers.json';

export function DataGallery({ userType, theme, user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [papers, setPapers] = useState<PaperProps[]>([]);
  const [recommendations, setRecommendations] = useState<PaperProps[]>([]);
  const [recentlyPublished, setRecentlyPublished] = useState<PaperProps[]>([]);
  const [topicBasedPapers, setTopicBasedPapers] = useState<PaperProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<PaperProps | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  const [isNotifying, setIsNotifying] = useState(false);

  const [topicFilters, setTopicFilters] = useState({
    category: '',
    experimentType: '',
    dataFile: ''
  });

  const [searchFilters, setSearchFilters] = useState({
    year: '',
    institution: '',
    topic: '',
    minCitations: ''
  });

  const mockRecommendations: PaperProps[] = [
    {
      id: 'rec_1',
      title: 'Breakthrough Discoveries in Space Radiation Protection',
      reason: 'Based on your interest in space medicine',
      relevanceScore: 0.85,
      type: 'recommended',
      abstract: 'Recent advances in radiation shielding technologies for long-duration space missions, including novel composite materials and active magnetic shielding systems. This paper also explores the biological impact of different radiation types.',
      authors: ['Dr. Alex Kim', 'Dr. Maria Santos'],
      institution: 'NASA Ames Research Center',
      publicationYear: 2024,
      tags: ['radiation protection', 'space medicine', 'shielding', 'materials science'],
      citationCount: 156,
      downloadUrl: 'https://example.com/papers/rec_1.pdf',
      externalUrl: 'https://nasa.gov/papers/rec_1',
    },
    {
      id: 'rec_2',
      title: 'AI Applications in Mission Control Systems',
      reason: 'Popular among researchers this month',
      relevanceScore: 0.82,
      type: 'recommended',
      abstract: 'Integration of artificial intelligence in autonomous mission control and decision-making systems for enhanced efficiency and safety. Covers topics such as predictive maintenance and intelligent anomaly detection.',
      authors: ['Dr. Robert Chen', 'Dr. Jennifer Lee'],
      institution: 'Stanford University',
      publicationYear: 2024,
      tags: ['artificial intelligence', 'mission control', 'automation', 'software engineering'],
      citationCount: 98,
      downloadUrl: 'https://example.com/papers/rec_2.pdf',
      externalUrl: 'https://nasa.gov/papers/rec_2',
    }
  ];

  const testServerConnection = async () => {
    try {
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a8c168d/health`;
      const response = await fetch(healthUrl, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (response.ok) {
        console.log('Server health check:', await response.json());
      }
    } catch (error) {
      console.error('Server connection error:', error);
    }
  };

  useEffect(() => {
    testServerConnection();
    setPapers(papersData.papers.map(p => ({ ...p, type: 'search' })));
    loadRecentlyPublished();
    if (user?.id) {
      loadRecommendations();
    }
    loadTopicBasedPapers();
  }, [user]);

  const loadRecentlyPublished = async () => {
    setLoading(true);
    try {
      const recent = papersData.papers.filter(p => p.publicationYear === 2024).map(p => ({ ...p, type: 'recentlyPublished' }));
      setRecentlyPublished(recent);
    } catch (error) {
      console.error('Failed to load recently published papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setRecommendations(mockRecommendations);
      if (!user?.id) return;

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-0a8c168d/recommendations/${user.id}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.recommendations?.length > 0) {
          setRecommendations(data.recommendations.map((p: PaperProps) => ({ ...p, type: 'recommended' })));
        }
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadTopicBasedPapers = async (filters = topicFilters) => {
    setLoading(true);
    try {
      const filtered = papersData.papers.filter(paper => {
        const matchesCategory = filters.category && filters.category !== 'all_categories' ? paper.tags.some(tag => tag.toLowerCase().includes(filters.category.toLowerCase())) : true;
        const matchesExperimentType = filters.experimentType && filters.experimentType !== 'all_experiment_types' ? paper.tags.some(tag => tag.toLowerCase().includes(filters.experimentType.toLowerCase())) : true;
        const matchesDataFile = filters.dataFile && filters.dataFile !== 'all_data_files' ? paper.tags.some(tag => tag.toLowerCase().includes(filters.dataFile.toLowerCase())) : true;
        return matchesCategory && matchesExperimentType && matchesDataFile;
      }).map(p => ({ ...p, type: 'topicBased' }));

      await new Promise(resolve => setTimeout(resolve, 500));
      setTopicBasedPapers(filtered);
    } catch (error) {
      console.error('Failed to load topic-based papers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopicBasedPapers();
  }, [topicFilters]);

  const searchPapers = async () => {
    if (!searchQuery.trim() && !Object.values(searchFilters).some(filter => filter !== '' && filter !== 'all_years' && filter !== 'all_institutions' && filter !== 'all_topics')) {
      setPapers(papersData.papers.map(p => ({ ...p, type: 'search' })));
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const filteredSearchPapers = papersData.papers.filter(paper => {
        const queryMatch = searchQuery.trim() === '' ||
                           paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           paper.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           paper.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const yearMatch = searchFilters.year && searchFilters.year !== 'all_years' ? paper.publicationYear === parseInt(searchFilters.year) : true;
        const institutionMatch = searchFilters.institution && searchFilters.institution !== 'all_institutions' ? paper.institution.toLowerCase().includes(searchFilters.institution.toLowerCase()) : true;
        const topicMatch = searchFilters.topic && searchFilters.topic !== 'all_topics' ? paper.tags.some(tag => tag.toLowerCase().includes(searchFilters.topic.toLowerCase())) : true;
        const minCitationsMatch = searchFilters.minCitations ? paper.citationCount >= parseInt(searchFilters.minCitations) : true;

        return queryMatch && yearMatch && institutionMatch && topicMatch && minCitationsMatch;
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setPapers(filteredSearchPapers.map(p => ({ ...p, type: 'search' })));
      setActiveTab('search');
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackInteraction = async (paperId: string, action: string, metadata = {}) => {
    try {
      console.log(`Tracking interaction: ${action} for paper ${paperId}`);
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  const handlePaperClick = (paper: PaperProps) => {
    setSelectedPaper(paper);
    trackInteraction(paper.id, 'view');
  };

  const handleDownload = (paper: PaperProps, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    trackInteraction(paper.id, 'download');
    console.log('Downloading paper:', paper.title);
    if (paper.downloadUrl) {
      window.open(paper.downloadUrl, '_blank');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchPapers();
    }
  };

  const clearSearchFilters = () => {
    setSearchQuery('');
    setSearchFilters({ year: '', institution: '', topic: '', minCitations: '' });
    setHasSearched(false);
    setPapers(papersData.papers.map(p => ({ ...p, type: 'search' })));
  };

  const clearTopicFilters = () => {
    setTopicFilters({ category: '', experimentType: '', dataFile: '' });
  };

  const handleNotifyMe = () => {
    setIsNotifying(true);
    toast.success("You'll be notified of new research! ✨", {
      position: "top-right",
      style: {
        background: '#333',
        color: '#fff',
      },
      iconTheme: {
        primary: theme.primaryColor,
        secondary: '#fff',
      },
    });
    setTimeout(() => {
      setIsNotifying(false);
    }, 2000);
  };

  const EmptyState = ({ type }: { type: 'search' | 'results' | 'recommendations' | 'recent' | 'topic' }) => {
    const messages = {
      search: {
        icon: Search,
        title: "Discover Research Papers",
        description: "Use semantic search to find relevant NASA research papers and space life sciences studies.",
        action: "Start by typing your research query or using the filters above"
      },
      results: {
        icon: FileText,
        title: "No Results Found",
        description: "Try adjusting your search terms or filters to find relevant papers.",
        action: "Modify your search or explore recommendations"
      },
      recommendations: {
        icon: Sparkles,
        title: "No Recommendations Yet",
        description: "Your personalized recommendations will appear here based on your activity.",
        action: "Start searching and interacting with papers to get recommendations"
      },
      recent: {
        icon: Clock,
        title: "No Recently Published Papers",
        description: "Check back later for the latest research papers.",
        action: "Stay tuned for new publications"
      },
      topic: {
        icon: Tag,
        title: "No Papers for this Topic",
        description: "Adjust your topic filters or explore other categories.",
        action: "Try different filters or browse all topics"
      }
    };

    const message = messages[type];
    const Icon = message.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${theme.primary} mx-auto mb-6 flex items-center justify-center`}>
          <Icon className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl text-white mb-3">{message.title}</h3>
        <p className="text-gray-400 mb-4 max-w-md mx-auto">{message.description}</p>
        <p className="text-sm text-gray-500">{message.action}</p>
      </motion.div>
    );
  };

  return (
    <div className="h-full overflow-auto custom-scrollbar relative">
      <Toaster />
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full bg-gradient-to-r ${theme.primary}`}>
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl text-white">Data Gallery</h1>
                <p className="text-gray-400">Search and explore NASA research papers and space life sciences data</p>
              </div>
            </div>
            <Button
              onClick={handleNotifyMe}
              className={`bg-gradient-to-r ${theme.primary} hover:opacity-90 px-6 relative overflow-hidden`}
              disabled={isNotifying}
            >
              <AnimatePresence>
                {isNotifying ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center"
                  >
                    <BellRing className="w-4 h-4 mr-2" />
                    Notifying...
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center"
                  >
                    <BellRing className="w-4 h-4 mr-2" />
                    Get Notified
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 relative"
        >
          <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search research papers using semantic search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <Button
                  onClick={searchPapers}
                  disabled={loading}
                  className={`bg-gradient-to-r ${theme.primary} hover:opacity-90 px-8`}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Filters for Search */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <Select value={searchFilters.year} onValueChange={(value) => setSearchFilters({ ...searchFilters, year: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Publication Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white z-[9999]">
                    <SelectItem value="all_years">All Years</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                    <SelectItem value="2020">2020</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={searchFilters.institution} onValueChange={(value) => setSearchFilters({ ...searchFilters, institution: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Institution" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white z-[9999]">
                    <SelectItem value="all_institutions">All Institutions</SelectItem>
                    <SelectItem value="nasa_johnson">NASA Johnson Space Center</SelectItem>
                    <SelectItem value="kennedy_space_center">Kennedy Space Center</SelectItem>
                    <SelectItem value="jpl">Jet Propulsion Laboratory</SelectItem>
                    <SelectItem value="baylor_medicine">Baylor College of Medicine</SelectItem>
                    <SelectItem value="ut_austin">University of Texas at Austin</SelectItem>
                    <SelectItem value="upenn">University of Pennsylvania</SelectItem>
                    <SelectItem value="georgia_tech">Georgia Tech</SelectItem>
                    <SelectItem value="cmu">Carnegie Mellon University</SelectItem>
                    <SelectItem value="uc_boulder">University of Colorado Boulder</SelectItem>
                    <SelectItem value="uc_davis">University of California, Davis</SelectItem>
                    <SelectItem value="nasa_ames">NASA Ames Research Center</SelectItem>
                    <SelectItem value="stanford">Stanford University</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={searchFilters.topic} onValueChange={(value) => setSearchFilters({ ...searchFilters, topic: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Research Topic" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white z-[9999]">
                    <SelectItem value="all_topics">All Topics</SelectItem>
                    <SelectItem value="microgravity">Microgravity</SelectItem>
                    <SelectItem value="space medicine">Space Medicine</SelectItem>
                    <SelectItem value="astrobiology">Astrobiology</SelectItem>
                    <SelectItem value="life support">Life Support</SelectItem>
                    <SelectItem value="radiation">Radiation</SelectItem>
                    <SelectItem value="plants">Plants</SelectItem>
                    <SelectItem value="animals">Animals</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="immunology">Immunology</SelectItem>
                    <SelectItem value="robotics">Robotics</SelectItem>
                    <SelectItem value="materials science">Materials Science</SelectItem>
                    <SelectItem value="behavioral health">Behavioral Health</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min Citations"
                    value={searchFilters.minCitations}
                    onChange={(e) => setSearchFilters({ ...searchFilters, minCitations: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                  <Button
                    variant="ghost"
                    onClick={clearSearchFilters}
                    className="text-gray-400 hover:text-white px-3"
                    title="Clear Search Filters"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recently Published Papers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-full bg-gradient-to-r ${theme.primary} text-white`}>
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-2xl text-white">Recently Published Papers</h2>
          </div>
          {loading && recentlyPublished.length === 0 ? (
            <div className="py-10">
              <LoadingAnimation userType={userType} theme={theme} />
            </div>
          ) : recentlyPublished.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {recentlyPublished.map((paper) => (
                  <DocBox
                    key={paper.id}
                    paper={paper}
                    theme={theme}
                    onPaperClick={handlePaperClick}
                    onDownload={handleDownload}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState type="recent" />
          )}
        </motion.div>

        {/* Research Papers by Topic Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 z-20 rounded-full bg-gradient-to-r ${theme.primary} text-white`}>
              <Tag className="w-5 h-5" />
            </div>
            <h2 className="text-2xl text-white">Research Papers by Topic</h2>
          </div>
          <Card className="relative bg-white/[0.02] backdrop-blur-sm border-white/10 mb-6 z-10 overflow-visible">
  <CardContent className="p-6 overflow-visible">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-visible">
      {/* Category Select */}
      <Select
        value={topicFilters.category}
        onValueChange={(value) =>
          setTopicFilters({ ...topicFilters, category: value })
        }
      >
        <SelectTrigger className="bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="Category" />
        </SelectTrigger>

        {/* ✅ Force render outside card */}
        <SelectContent
          className="!z-[99999] bg-slate-900 border border-white/20 text-white shadow-lg backdrop-blur-none"
          position="popper"
          side="bottom"
          align="start"
          
          avoidCollisions={false}
          portal
        >
          <SelectItem value="all_categories">All Categories</SelectItem>
          <SelectItem value="biology">Biological</SelectItem>
          <SelectItem value="engineering">Engineering</SelectItem>
          <SelectItem value="medicine">Space Medicine</SelectItem>
          <SelectItem value="astrobiology">Astrobiology</SelectItem>
        </SelectContent>
      </Select>

      {/* Experiment Type Select */}
      <Select
        value={topicFilters.experimentType}
        onValueChange={(value) =>
          setTopicFilters({ ...topicFilters, experimentType: value })
        }
      >
        <SelectTrigger className="bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="Experiment Type" />
        </SelectTrigger>

        <SelectContent
          className="!z-[99999] bg-slate-900 top-2/3 border border-white/20 text-white shadow-lg backdrop-blur-none"
          position="popper"
          side="bottom"
          align="start"
          
          avoidCollisions={false}
          portal
        >
          <SelectItem value="all_experiment_types">All Experiment Types</SelectItem>
          <SelectItem value="plants">Plants Research</SelectItem>
          <SelectItem value="animals">Animals Research</SelectItem>
          <SelectItem value="human">Human Studies</SelectItem>
          <SelectItem value="environmental">Environmental Experiments</SelectItem>
        </SelectContent>
      </Select>

      {/* Data File Select + Clear */}
      <div className="flex gap-2">
        <Select
          value={topicFilters.dataFile}
          onValueChange={(value) =>
            setTopicFilters({ ...topicFilters, dataFile: value })
          }
        >
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Data Filter" />
          </SelectTrigger>

          <SelectContent
            className="!z-[99999] bg-slate-900 py-30px border border-white/20 text-white shadow-lg backdrop-blur-none"
            position="popper"
            side="bottom"
            sideOffset={30} 
            align="start"
            
            avoidCollisions={false}
            portal
          >
            <SelectItem value="all_data_files">All Data Files</SelectItem>
            <SelectItem value="genomics">Genomics Data</SelectItem>
            <SelectItem value="proteomics">Proteomics Data</SelectItem>
            <SelectItem value="imaging">Imaging Data</SelectItem>
            <SelectItem value="sensor">Sensor Data</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          onClick={clearTopicFilters}
          className="text-gray-400 hover:text-white px-3"
          title="Clear Topic Filters"
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </CardContent>
</Card>


          {loading && topicBasedPapers.length === 0 ? (
            <div className="py-10">
              <LoadingAnimation userType={userType} theme={theme} />
            </div>
          ) : topicBasedPapers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {topicBasedPapers.map((paper) => (
                  <DocBox
                    key={paper.id}
                    paper={paper}
                    theme={theme}
                    onPaperClick={handlePaperClick}
                    onDownload={handleDownload}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState type="topic" />
          )}
        </motion.div>

        {/* Tabs for Search Results and Recommendations */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-10">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
            <TabsTrigger value="search" className="data-[state=active]:bg-white/20">
              <Search className="w-4 h-4 mr-2" />
              Search Results
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-white/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            {loading && hasSearched && papers.length === 0 ? (
              <div className="py-16">
                <LoadingAnimation userType={userType} theme={theme} />
              </div>
            ) : papers.length === 0 ? (
              <EmptyState type="results" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {papers.map((paper) => (
                    <DocBox key={paper.id} paper={paper} theme={theme} onPaperClick={handlePaperClick} onDownload={handleDownload} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            {recommendations.length > 0 ? (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl text-white mb-2">Personalized for You</h3>
                  <p className="text-gray-400">Based on your search history and research interests</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {recommendations.map((paper) => (
                      <DocBox key={paper.id} paper={paper} theme={theme} onPaperClick={handlePaperClick} onDownload={handleDownload} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <EmptyState type="recommendations" />
            )}
          </TabsContent>
        </Tabs>

        {/* Paper Detail Modal */}
        <AnimatePresence>
          {selectedPaper && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={() => setSelectedPaper(null)}
            >
              {/* Background overlay */}
              <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" />

              {/* Modal content */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-slate-900/95 backdrop-blur-xl border border-blue-400/20 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-auto custom-scrollbar shadow-2xl text-white"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(29, 78, 216, 0.15) 50%, rgba(37, 99, 235, 0.2) 100%), rgba(15, 23, 42, 0.95)'
                }}
              >
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-3xl font-bold pr-8 leading-tight">{selectedPaper.title}</h2>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPaper(null)}
                    className="text-white hover:bg-white/10 p-2 rounded-full"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-3">Abstract</h3>
                      <p className="text-blue-100 leading-relaxed">{selectedPaper.abstract}</p>
                    </div>

                    {selectedPaper.id === 'mock_paper_1' && (
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold mb-3">Key Findings</h3>
                        <ul className="space-y-2 text-blue-100">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-300 mt-1">•</span>
                            Cardiac output decreased by 15% after 30 days in microgravity
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-300 mt-1">•</span>
                            Blood pressure regulation mechanisms adapted within 60 days
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div>
                      <h4 className="font-semibold mb-2">Authors</h4>
                      <p className="text-blue-100 text-sm">{selectedPaper.authors?.join(', ')}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Publication Year</h4>
                      <p className="text-blue-100 text-sm">{selectedPaper.publicationYear}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Institution</h4>
                      <p className="text-blue-100 text-sm">{selectedPaper.institution}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Citations</h4>
                      <p className="text-blue-100 text-sm">{selectedPaper.citationCount}</p>
                    </div>

                    {selectedPaper.tags && (
                      <div>
                        <h4 className="font-semibold mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPaper.tags.map((tag, index) => (
                            <Badge key={index} className="text-xs bg-blue-700/50 text-blue-100 border-blue-400/30">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-6 space-y-3">
                      {selectedPaper.downloadUrl && (
                        <Button
                          onClick={() => window.open(selectedPaper.externalUrl, '_blank')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          View Online
                        </Button>
                      )}
                      {selectedPaper.externalUrl && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(selectedPaper.externalUrl, '_blank')}
                          className="w-full border-blue-400/50 text-blue-100 hover:bg-blue-700/30 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Download from website
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}