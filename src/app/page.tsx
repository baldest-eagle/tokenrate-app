"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  Search,
  Image as ImageIcon,
  Code,
  FileJson,
  Mic,
  Video,
  Zap,
  X,
  ArrowDownAZ,
  DollarSign,
  Building2,
  Network,
  ChevronDown,
  ChevronUp,
  Filter,
  Sun,
  Moon,
  RefreshCw,
  Scale,
  Sparkles,
  Calendar,
  Check,
  Plus,
  AlertCircle
} from "lucide-react";

type AIModel = {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  context: string;
  maxOutput?: string;
  inputModalities?: string[];
  outputModalities?: string[];
  tier: string;
  capabilities: string[];
  description: string;
  useCase?: string;
  standout?: string;
  releaseDate?: string;
};

type SortOption = "alphabetical" | "provider" | "family" | "price";

const getCapabilityIcon = (capability: string) => {
  const cap = capability.toLowerCase();
  if (cap.includes("vision")) return <ImageIcon className="w-4 h-4" />;
  if (cap.includes("function")) return <Code className="w-4 h-4" />;
  if (cap.includes("json")) return <FileJson className="w-4 h-4" />;
  if (cap.includes("audio")) return <Mic className="w-4 h-4" />;
  if (cap.includes("video")) return <Video className="w-4 h-4" />;
  return <Zap className="w-4 h-4" />;
};

const formatCapability = (capability: string) => {
  if (!capability) return "";
  return capability
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getFamily = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("gpt")) return "GPT";
  if (n.includes("claude")) return "Claude";
  if (n.includes("llama")) return "Llama";
  if (n.includes("gemini")) return "Gemini";
  return "Other";
};

export default function Home() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting and Display State
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("All");
  const [filterCapability, setFilterCapability] = useState<string>("All");

  // Comparison State (Max 3 selections)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareWarning, setCompareWarning] = useState<string | null>(null);

  // Description expansion state
  const [isExpandedDesc, setIsExpandedDesc] = useState(false);
  const [fullDescriptions, setFullDescriptions] = useState<Record<string, string>>({});
  const [loadingDesc, setLoadingDesc] = useState(false);

  useEffect(() => {
    setIsExpandedDesc(false);
  }, [selectedModel?.id]);

  const toggleCompare = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        setCompareWarning("Maximum 3 models can be compared at a time.");
        setTimeout(() => setCompareWarning(null), 3000);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleToggleDescription = async () => {
    if (!selectedModel) return;
    if (!isExpandedDesc && !fullDescriptions[selectedModel.id]) {
      setLoadingDesc(true);
      try {
        const res = await fetch(`/api/models/description?id=${encodeURIComponent(selectedModel.id)}`);
        const data = await res.json();
        if (data && data.description) {
          setFullDescriptions((prev) => ({ ...prev, [selectedModel.id]: data.description }));
        }
      } catch (e) {
        console.warn("Could not fetch full description", e);
      } finally {
        setLoadingDesc(false);
      }
    }
    setIsExpandedDesc((prev) => !prev);
  };

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(data);
    } catch (err) {
      console.error("Failed to fetch models", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Reset expanded groups when sort changes
  useEffect(() => {
    setExpandedGroups({});
  }, [sortBy]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Derive unique options for dropdowns based on full dataset
  const uniqueProviders = useMemo(() => {
    const providers = new Set(models.map(m => m.provider));
    return Array.from(providers).sort();
  }, [models]);

  const uniqueCapabilities = useMemo(() => {
    const caps = new Set<string>();
    models.forEach(m => m.capabilities.forEach(c => caps.add(c)));
    return Array.from(caps).sort();
  }, [models]);

  // Apply search and filters
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      // Search logic
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        model.name.toLowerCase().includes(searchLower) ||
        model.provider.toLowerCase().includes(searchLower) ||
        getFamily(model.name).toLowerCase().includes(searchLower) ||
        model.tier.toLowerCase().includes(searchLower) ||
        model.capabilities.some(cap => cap.toLowerCase().includes(searchLower));

      // Filter logic
      const matchesProvider = filterProvider === "All" || model.provider === filterProvider;
      const matchesCapability = filterCapability === "All" || model.capabilities.includes(filterCapability);

      return matchesSearch && matchesProvider && matchesCapability;
    });
  }, [models, searchQuery, filterProvider, filterCapability]);

  // Sorting for flat views
  const sortedModels = useMemo(() => {
    if (sortBy === "provider" || sortBy === "family") return [];
    
    return [...filteredModels].sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.name.localeCompare(b.name);
        case "price":
          const priceA = a.inputPrice + a.outputPrice;
          const priceB = b.inputPrice + b.outputPrice;
          return priceA - priceB;
        default:
          return 0;
      }
    });
  }, [filteredModels, sortBy]);

  // Grouping for accordion views
  const groupedModels = useMemo(() => {
    if (sortBy === "provider" || sortBy === "family") {
      const groups: Record<string, AIModel[]> = {};
      filteredModels.forEach((model) => {
        const key = sortBy === "provider" ? model.provider : getFamily(model.name);
        if (!groups[key]) groups[key] = [];
        groups[key].push(model);
      });
      return Object.keys(groups)
        .sort()
        .map((key) => ({
          group: key,
          items: groups[key].sort((a, b) => a.name.localeCompare(b.name)),
        }));
    }
    return null;
  }, [filteredModels, sortBy]);

  const renderModelCard = (model: AIModel) => (
    <div
      key={model.name}
      onClick={() => setSelectedModel(model)}
      className="group flex flex-col bg-rp-surface/70 backdrop-blur-md rounded-3xl p-6 border border-rp-hl-med/50 shadow-lg shadow-rp-hl-low/40 dark:shadow-none hover:shadow-xl hover:shadow-rp-love/10 transition-all duration-300 cursor-pointer hover:-translate-y-2 overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rp-love to-rp-iris opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1 text-rp-text group-hover:text-rp-love transition-colors">{model.name}</h3>
          <p className="text-sm text-rp-subtle font-medium">
            {model.provider}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rp-love/10 text-rp-love border border-rp-love/20">
            {model.tier}
          </span>
          <button
            onClick={(e) => toggleCompare(model.id, e)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              compareIds.includes(model.id)
                ? "bg-rp-pine text-white shadow-sm ring-2 ring-rp-pine/30"
                : "bg-rp-overlay/80 hover:bg-rp-hl-low text-rp-subtle hover:text-rp-text border border-rp-hl-med/60"
            }`}
            title={compareIds.includes(model.id) ? "Remove from comparison" : "Add to comparison (up to 3)"}
          >
            {compareIds.includes(model.id) ? (
              <>
                <Check className="w-3 h-3 text-white" />
                <span>Comparing</span>
              </>
            ) : (
              <>
                <Scale className="w-3 h-3 text-rp-foam" />
                <span>Compare</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 text-sm text-rp-muted">
        <Network className="w-4 h-4 text-rp-foam" />
        <span>{getFamily(model.name)} Family</span>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 pt-6 border-t border-rp-hl-med/30">
        <div>
          <p className="text-xs text-rp-subtle mb-1">Pricing (1M tokens)</p>
          <p className="text-sm font-semibold text-rp-text">
            ${model.inputPrice} in / ${model.outputPrice} out
          </p>
        </div>
        <div>
          <p className="text-xs text-rp-subtle mb-1">Context</p>
          <p className="text-sm font-semibold text-rp-text">
            {model.context.toLocaleString()} tokens
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {model.capabilities && model.capabilities.length > 0 ? (
          model.capabilities.map((cap) => (
            <div
              key={cap}
              title={formatCapability(cap)}
              className="p-2 rounded-xl bg-rp-overlay text-rp-subtle border border-rp-hl-low transition-colors group-hover:bg-rp-foam/10 group-hover:text-rp-foam group-hover:border-rp-foam/20"
            >
              {getCapabilityIcon(cap)}
            </div>
          ))
        ) : (
          <div title="Standard Text" className="p-2 rounded-xl bg-rp-overlay text-rp-subtle border border-rp-hl-low transition-colors group-hover:bg-rp-hl-med">
            <Zap className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rp-base via-rp-base to-rp-surface text-rp-text font-sans p-6 md:p-12 selection:bg-rp-iris/30">
      <header className="max-w-6xl mx-auto mb-12 relative">
        <div className="absolute top-[-2rem] right-0 hidden sm:block select-none">
          <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[450px] lg:h-[450px] border-[12px] border-logo-border shadow-2xl rounded-sm overflow-hidden">
            <Image
              src="/hermes-logo-v7.jpg"
              alt="Hermes Logo"
              fill
              className="object-cover opacity-90 pointer-events-none"
            />
            {/* Toggle overlaid on headphone speaker — 65.1% left, 51.3% top */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle light/dark mode"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="absolute w-[7%] h-[7%] rounded-full flex items-center justify-center cursor-pointer focus:outline-none hover:scale-110 transition-all duration-200 border-none bg-transparent p-[3px]"
                style={{
                  left: "65.1%", top: "51.3%", transform: "translate(-50%, -50%)",
                }}
              >
                {theme === "dark" ? (
                  <Sun
                    className="w-full h-full transition-colors duration-300"
                    style={{ color: "#31748f" /* Rosé Pine Pine */ }}
                  />
                ) : (
                  <Moon
                    className="w-full h-full transition-colors duration-300"
                    style={{ color: "#9ccfd8" /* Rosé Pine Foam */ }}
                  />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 mb-10">
          <div className="text-center md:text-left z-10">
            <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-sm font-medium rounded-full bg-rp-love/10 text-rp-love border border-rp-love/20">
              <Zap className="w-4 h-4 mr-2" />
              Updated for the latest models
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-rp-love to-rp-iris">
              AI Model Directory
            </h1>
            <p className="text-rp-subtle text-lg max-w-xl mx-auto md:mx-0 leading-relaxed z-10 relative">
              Explore and compare the latest AI models. View pricing, context windows, and capabilities to find the perfect fit for your next project.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 mb-8 max-w-xl mx-auto md:mx-0 z-10 relative">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-rp-love to-rp-iris rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rp-muted group-focus-within:text-rp-love transition-colors" />
              <input 
                type="text"
                placeholder="Search models by name, provider, family, or capability..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-rp-hl-med bg-rp-surface/80 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-rp-love/50 shadow-lg shadow-rp-hl-low/20 dark:shadow-none transition-all text-sm md:text-base placeholder:text-rp-muted"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-rp-surface/80 backdrop-blur-md border border-rp-hl-med rounded-xl px-4 shadow-sm hover:border-rp-love/30 focus-within:border-rp-love/50 focus-within:ring-2 focus-within:ring-rp-love/20 transition-all">
              <Filter className="w-4 h-4 text-rp-love" />
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="py-3 text-sm bg-transparent border-none focus:outline-none cursor-pointer text-rp-text font-medium"
              >
                <option value="All" className="bg-rp-surface text-rp-text">All Providers</option>
                {uniqueProviders.map(p => (
                  <option key={p} value={p} className="bg-rp-surface text-rp-text">{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-rp-surface/80 backdrop-blur-md border border-rp-hl-med rounded-xl px-4 shadow-sm hover:border-rp-foam/30 focus-within:border-rp-foam/50 focus-within:ring-2 focus-within:ring-rp-foam/20 transition-all">
              <Zap className="w-4 h-4 text-rp-foam" />
              <select
                value={filterCapability}
                onChange={(e) => setFilterCapability(e.target.value)}
                className="py-3 text-sm bg-transparent border-none focus:outline-none cursor-pointer text-rp-text font-medium"
              >
                <option value="All" className="bg-rp-surface text-rp-text">All Capabilities</option>
                {uniqueCapabilities.map(c => (
                  <option key={c} value={c} className="bg-rp-surface text-rp-text">{formatCapability(c)}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchModels}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rp-surface/80 backdrop-blur-md border border-rp-hl-med text-rp-text hover:bg-rp-hl-low hover:border-rp-love/50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-rp-love/50 disabled:opacity-70 disabled:cursor-not-allowed font-medium ml-auto md:ml-0"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-rp-love ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        
        {/* Sort Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-rp-surface/60 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-rp-hl-med w-fit">
          <span className="pl-3 pr-2 text-sm font-medium text-rp-muted hidden sm:inline">Sort by:</span>
          {[
            { id: "alphabetical", label: "Alphabetical", icon: ArrowDownAZ, color: "rp-love" },
            { id: "provider", label: "Provider", icon: Building2, color: "rp-foam" },
            { id: "family", label: "Family", icon: Network, color: "rp-iris" },
            { id: "price", label: "Price", icon: DollarSign, color: "rp-gold" }
          ].map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setSortBy(id as SortOption)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                sortBy === id
                  ? "bg-rp-hl-low text-rp-text shadow-md shadow-rp-hl-low/50 ring-1 ring-rp-hl-med"
                  : "text-rp-subtle hover:bg-rp-hl-low/50 hover:text-rp-text"
              }`}
            >
              <Icon className={`w-4 h-4 ${sortBy === id ? `text-${color}` : ''}`} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-rp-love to-rp-iris rounded-full blur animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-rp-text"></div>
            </div>
            <p className="text-rp-subtle font-medium">Loading models...</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-rp-muted bg-rp-surface/40 backdrop-blur-sm rounded-3xl border border-rp-hl-med border-dashed">
            <div className="p-4 bg-rp-hl-low rounded-full mb-4">
              <Search className="w-8 h-8 text-rp-muted" />
            </div>
            <p className="text-xl font-bold text-rp-text mb-2">No models found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            {groupedModels ? (
              <div className="space-y-6">
                {groupedModels.map(({ group, items }) => (
                  <div key={group} className="border border-rp-hl-med rounded-3xl bg-rp-surface/60 backdrop-blur-xl overflow-hidden shadow-lg shadow-rp-hl-low/20 dark:shadow-none transition-all duration-300 hover:shadow-xl hover:border-rp-love/30">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between p-6 text-left hover:bg-rp-surface/90 transition-colors group/btn"
                    >
                      <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rp-text to-rp-subtle group-hover/btn:from-rp-love group-hover/btn:to-rp-iris transition-all">{group}</h2>
                        <span className="text-sm font-semibold text-rp-love bg-rp-love/10 border border-rp-love/20 px-3 py-1 rounded-full">
                          {items.length} {items.length === 1 ? 'model' : 'models'}
                        </span>
                      </div>
                      <div className={`text-rp-muted transition-transform duration-300 ${expandedGroups[group] ? 'rotate-180 text-rp-love' : ''}`}>
                        <ChevronDown className="w-6 h-6" />
                      </div>
                    </button>
                    
                    {expandedGroups[group] && (
                      <div className="p-6 pt-0 border-t border-rp-hl-med/50 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                          {items.map(model => renderModelCard(model))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {sortedModels.map((model) => renderModelCard(model))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Compare Bar */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-4xl mx-auto z-40 bg-rp-surface/95 backdrop-blur-2xl border border-rp-hl-med shadow-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-bold text-rp-text">
              <Scale className="w-5 h-5 text-rp-love" />
              <span>Comparing ({compareIds.length}/3):</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {compareIds.map((id) => {
                const m = models.find((item) => item.id === id);
                if (!m) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rp-overlay border border-rp-hl-med text-xs font-semibold text-rp-text shadow-sm"
                  >
                    <span className="truncate max-w-[130px]">{m.name}</span>
                    <button
                      onClick={() => toggleCompare(id)}
                      className="hover:text-rp-love text-rp-muted transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {compareWarning && (
              <span className="text-xs font-medium text-rp-love flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" /> {compareWarning}
              </span>
            )}
            <button
              onClick={() => setCompareIds([])}
              className="px-3 py-2 text-xs font-semibold text-rp-subtle hover:text-rp-text transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => setIsCompareOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rp-love to-rp-iris text-white font-bold text-xs md:text-sm shadow-md shadow-rp-love/20 hover:opacity-95 hover:scale-105 transition-all cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              Compare Side-by-Side
            </button>
          </div>
        </div>
      )}

      {/* Model Detail Modal */}
      {selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rp-base/80 backdrop-blur-md transition-opacity duration-300">
          <div 
            className="fixed inset-0"
            onClick={() => setSelectedModel(null)}
          />
          <div className="relative bg-rp-surface/95 backdrop-blur-xl rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-300 scale-100 opacity-100 border border-rp-hl-med">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rp-love to-rp-iris" />
            <div className="px-8 py-6 border-b border-rp-hl-med flex justify-between items-center mt-2 sticky top-0 bg-rp-surface/95 backdrop-blur-md z-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-rp-text">{selectedModel.name}</h2>
                <p className="text-rp-love font-medium">{selectedModel.provider}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCompare(selectedModel.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    compareIds.includes(selectedModel.id)
                      ? "bg-rp-pine text-white shadow-sm ring-2 ring-rp-pine/40"
                      : "bg-rp-hl-low hover:bg-rp-hl-med text-rp-text border border-rp-hl-med"
                  }`}
                  title={compareIds.includes(selectedModel.id) ? "Remove from comparison" : "Add to comparison (up to 3)"}
                >
                  {compareIds.includes(selectedModel.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Comparing</span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-3.5 h-3.5 text-rp-foam" />
                      <span>Compare</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedModel(null)}
                  className="p-2 rounded-full bg-rp-hl-low hover:bg-rp-hl-med text-rp-subtle transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-8">
              {/* Description with More / Less */}
              <div className="mb-6 bg-rp-overlay/60 p-5 rounded-2xl border border-rp-hl-low">
                <h4 className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-2">Description</h4>
                <p className="text-base text-rp-text leading-relaxed whitespace-pre-line">
                  {isExpandedDesc && fullDescriptions[selectedModel.id]
                    ? fullDescriptions[selectedModel.id]
                    : selectedModel.description}
                </p>
                <button
                  onClick={handleToggleDescription}
                  disabled={loadingDesc}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-rp-love hover:text-rp-rose transition-colors cursor-pointer group"
                >
                  {loadingDesc ? (
                    <span className="animate-pulse flex items-center gap-1 text-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading full description...
                    </span>
                  ) : (
                    <>
                      <span>{isExpandedDesc ? "Less" : "More"}</span>
                      {isExpandedDesc ? (
                        <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                      ) : (
                        <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                      )}
                    </>
                  )}
                </button>
              </div>

              {/* Intended Use Case & What Makes It Stand Out */}
              {(selectedModel.useCase || selectedModel.standout) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {selectedModel.useCase && (
                    <div className="bg-rp-overlay/60 p-5 rounded-2xl border border-rp-hl-low">
                      <h4 className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-rp-foam" /> Intended Use Case
                      </h4>
                      <p className="text-sm text-rp-text leading-relaxed">
                        {selectedModel.useCase}
                      </p>
                    </div>
                  )}
                  {selectedModel.standout && (
                    <div className="bg-rp-overlay/60 p-5 rounded-2xl border border-rp-hl-low">
                      <h4 className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-rp-gold" /> What Makes It Stand Out
                      </h4>
                      <p className="text-sm text-rp-text leading-relaxed">
                        {selectedModel.standout}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing & Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-rp-overlay p-6 rounded-2xl border border-rp-hl-low">
                  <h4 className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Pricing (per 1M tokens)
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-sm border-b border-rp-hl-med pb-2.5">
                      <span className="text-rp-subtle font-medium">Input</span>
                      <span className="font-bold text-rp-text">${selectedModel.inputPrice.toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-rp-hl-med pb-2.5">
                      <span className="text-rp-subtle font-medium">Output</span>
                      <span className="font-bold text-rp-text">${selectedModel.outputPrice.toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                      <span className="text-rp-subtle font-medium">Tier</span>
                      <span className="font-bold text-rp-love">{selectedModel.tier}</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-rp-overlay p-6 rounded-2xl border border-rp-hl-low">
                  <h4 className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Context & Parameters
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-sm border-b border-rp-hl-med pb-2.5">
                      <span className="text-rp-subtle font-medium">Context Window</span>
                      <span className="font-bold text-rp-text">{selectedModel.context} tokens</span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-rp-hl-med pb-2.5">
                      <span className="text-rp-subtle font-medium">Max Output Limit</span>
                      <span className="font-bold text-rp-text">{selectedModel.maxOutput || '4,096 tokens'}</span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-rp-hl-med pb-2.5">
                      <span className="text-rp-subtle font-medium">Release Date</span>
                      <span className="font-bold text-rp-foam flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {selectedModel.releaseDate || 'Recent'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                      <span className="text-rp-subtle font-medium">Input Modalities</span>
                      <span className="font-bold text-rp-text capitalize">
                        {selectedModel.inputModalities?.join(', ') || 'Text'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <h4 className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-4">
                  Capabilities
                </h4>
                <div className="flex flex-wrap gap-3">
                  {selectedModel.capabilities && selectedModel.capabilities.length > 0 ? (
                    selectedModel.capabilities.map((cap) => (
                      <div
                        key={cap}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rp-surface border border-rp-hl-med text-sm font-semibold text-rp-text shadow-sm"
                      >
                        <span className="text-rp-foam">{getCapabilityIcon(cap)}</span>
                        {formatCapability(cap)}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rp-surface border border-rp-hl-med text-sm font-semibold text-rp-text shadow-sm">
                      <span className="text-rp-foam"><Zap className="w-4 h-4" /></span>
                      Standard Text
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Model Comparison Modal (Max 3) */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-rp-base/85 backdrop-blur-md overflow-hidden">
          <div
            className="fixed inset-0"
            onClick={() => setIsCompareOpen(false)}
          />
          <div className="relative bg-rp-surface/95 backdrop-blur-2xl rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-rp-hl-med animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rp-love via-rp-iris to-rp-foam" />
            
            {/* Comparison Modal Header */}
            <div className="px-6 md:px-8 py-5 border-b border-rp-hl-med flex flex-wrap items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rp-love/10 text-rp-love border border-rp-love/20">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-rp-text flex items-center gap-2">
                    Side-by-Side Model Comparison
                  </h2>
                  <p className="text-xs md:text-sm text-rp-subtle">
                    Comparing {compareIds.length} of 3 models simultaneously
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {compareIds.length < 3 && (
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          toggleCompare(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="text-xs md:text-sm py-2 px-3 rounded-xl bg-rp-overlay border border-rp-hl-med text-rp-text focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>+ Add model to compare...</option>
                      {models
                        .filter((m) => !compareIds.includes(m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id} className="bg-rp-surface text-rp-text">
                            {m.name} ({m.provider})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => setIsCompareOpen(false)}
                  className="p-2 rounded-full bg-rp-hl-low hover:bg-rp-hl-med text-rp-subtle hover:text-rp-text transition-colors cursor-pointer"
                  title="Close Comparison"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comparison Body */}
            <div className="overflow-y-auto p-6 md:p-8">
              {compareIds.length === 0 ? (
                <div className="text-center py-16">
                  <Scale className="w-12 h-12 text-rp-muted mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-bold text-rp-text mb-2">No models selected for comparison</p>
                  <p className="text-sm text-rp-subtle mb-6">Select up to 3 models from the directory or dropdown above.</p>
                </div>
              ) : (
                <div className={`grid grid-cols-1 ${compareIds.length === 2 ? 'md:grid-cols-2' : compareIds.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-xl mx-auto'} gap-6`}>
                  {compareIds.map((id) => {
                    const model = models.find((m) => m.id === id);
                    if (!model) return null;
                    return (
                      <div
                        key={model.id}
                        className="flex flex-col bg-rp-overlay/70 backdrop-blur-md rounded-3xl p-6 border border-rp-hl-med shadow-md relative overflow-hidden"
                      >
                        {/* Column Top Card Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rp-foam/10 text-rp-foam border border-rp-foam/20 mb-2">
                              {model.provider}
                            </span>
                            <h3 className="text-xl font-bold text-rp-text leading-tight">{model.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rp-love/10 text-rp-love border border-rp-love/20">
                              {model.tier}
                            </span>
                            <button
                              onClick={() => toggleCompare(model.id)}
                              className="p-1 rounded-full bg-rp-hl-low hover:bg-rp-love/20 hover:text-rp-love text-rp-muted transition-colors cursor-pointer"
                              title="Remove model"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Pricing Comparison */}
                        <div className="bg-rp-surface/80 p-4 rounded-2xl border border-rp-hl-med/60 mb-4">
                          <div className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-rp-love" /> Pricing (per 1M tokens)
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center pt-1">
                            <div className="bg-rp-overlay/60 p-2 rounded-xl">
                              <span className="text-[11px] text-rp-subtle block">Input</span>
                              <span className="font-bold text-sm text-rp-text">${model.inputPrice.toFixed(2)}</span>
                            </div>
                            <div className="bg-rp-overlay/60 p-2 rounded-xl">
                              <span className="text-[11px] text-rp-subtle block">Output</span>
                              <span className="font-bold text-sm text-rp-text">${model.outputPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Context & Output Parameters */}
                        <div className="bg-rp-surface/80 p-4 rounded-2xl border border-rp-hl-med/60 mb-4">
                          <div className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-rp-foam" /> Context & Output Parameters
                          </div>
                          <ul className="space-y-2 text-xs">
                            <li className="flex justify-between items-center py-1 border-b border-rp-hl-med/30">
                              <span className="text-rp-subtle">Context Window</span>
                              <span className="font-bold text-rp-text">{model.context} tokens</span>
                            </li>
                            <li className="flex justify-between items-center py-1 border-b border-rp-hl-med/30">
                              <span className="text-rp-subtle">Max Output Limit</span>
                              <span className="font-bold text-rp-text">{model.maxOutput || '4,096 tokens'}</span>
                            </li>
                            <li className="flex justify-between items-center py-1">
                              <span className="text-rp-subtle">Input Modalities</span>
                              <span className="font-bold text-rp-text capitalize">
                                {model.inputModalities?.join(', ') || 'Text'}
                              </span>
                            </li>
                          </ul>
                        </div>

                        {/* Intended Use Case */}
                        <div className="bg-rp-surface/80 p-4 rounded-2xl border border-rp-hl-med/60 mb-4 flex-1">
                          <div className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Code className="w-3.5 h-3.5 text-rp-iris" /> Intended Use Case
                          </div>
                          <p className="text-xs text-rp-text leading-relaxed">
                            {model.useCase || 'General conversational assistance and analytical queries.'}
                          </p>
                        </div>

                        {/* What Makes It Stand Out */}
                        <div className="bg-rp-surface/80 p-4 rounded-2xl border border-rp-hl-med/60 mb-4">
                          <div className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-rp-gold" /> What Makes It Stand Out
                          </div>
                          <p className="text-xs text-rp-text font-medium leading-relaxed">
                            {model.standout || 'High performance-to-cost ratio with versatile multi-turn reasoning.'}
                          </p>
                        </div>

                        {/* Release Date */}
                        <div className="bg-rp-surface/80 p-4 rounded-2xl border border-rp-hl-med/60 mb-4">
                          <div className="text-xs font-bold text-rp-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-rp-foam" /> Release Date
                          </div>
                          <p className="text-xs font-bold text-rp-text">
                            {model.releaseDate || 'Recent'}
                          </p>
                        </div>

                        {/* Capabilities */}
                        <div className="mt-auto pt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {model.capabilities && model.capabilities.length > 0 ? (
                              model.capabilities.map((c) => (
                                <span
                                  key={c}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rp-surface border border-rp-hl-med text-[11px] font-semibold text-rp-subtle"
                                >
                                  {getCapabilityIcon(c)}
                                  {formatCapability(c)}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-rp-muted">Standard Text</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
