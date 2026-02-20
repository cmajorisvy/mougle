import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout/Layout";
import { useLocation } from "wouter";
import {
  Bot, Check, Loader2, Trash2, Plus, Rocket,
  CheckCircle, ArrowRight, ArrowLeft, Settings,
  BookOpen, Globe, Sparkles,
} from "lucide-react";

const SKILLS = [
  "research", "writing", "analysis", "debate",
  "coding", "translation", "summarization", "moderation",
] as const;

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "claude-sonnet", label: "Claude Sonnet", provider: "Anthropic" },
  { value: "gemini-pro", label: "Gemini Pro", provider: "Google" },
] as const;

const DEPLOY_MODES = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
  { value: "debate", label: "Debate Participant" },
  { value: "api", label: "API Callable" },
  { value: "marketplace", label: "Marketplace Listing" },
] as const;

const SOURCE_TYPES = ["text", "link", "file", "discussion"] as const;

const STEPS = [
  { label: "Configure", icon: Settings },
  { label: "Train", icon: BookOpen },
  { label: "Deploy", icon: Rocket },
  { label: "Done", icon: CheckCircle },
];

interface KnowledgeSource {
  id: string;
  sourceType: string;
  title: string;
  content?: string;
  uri?: string;
}

export default function AgentBuilder() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [tags, setTags] = useState("");

  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [newSourceType, setNewSourceType] = useState<string>("text");
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceContent, setNewSourceContent] = useState("");
  const [newSourceUri, setNewSourceUri] = useState("");

  const [deployModes, setDeployModes] = useState<string[]>(["private"]);
  const [rateLimit, setRateLimit] = useState("60");
  const [listingTitle, setListingTitle] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [pricingModel, setPricingModel] = useState("one_time");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  const [createdAgent, setCreatedAgent] = useState<any>(null);
  const [error, setError] = useState("");

  const selectedModel = MODELS.find(m => m.value === model);
  const showMarketplace = deployModes.includes("marketplace");

  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const toggleDeployMode = (mode: string) => {
    setDeployModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]);
  };

  const addKnowledgeSource = () => {
    if (!newSourceTitle.trim()) return;
    const source: KnowledgeSource = {
      id: Math.random().toString(36).slice(2, 10),
      sourceType: newSourceType,
      title: newSourceTitle,
      content: newSourceType === "text" ? newSourceContent : undefined,
      uri: newSourceType !== "text" ? newSourceUri : undefined,
    };
    setKnowledgeSources(prev => [...prev, source]);
    setNewSourceTitle("");
    setNewSourceContent("");
    setNewSourceUri("");
  };

  const removeKnowledgeSource = (id: string) => {
    setKnowledgeSources(prev => prev.filter(s => s.id !== id));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const agentData = {
        name,
        persona,
        skills,
        systemPrompt,
        model,
        provider: selectedModel?.provider || "OpenAI",
        temperature,
        avatarUrl: avatarUrl || undefined,
        voiceId: voiceId || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      const agent = await api.userAgents.create(agentData);

      for (const source of knowledgeSources) {
        await api.userAgents.addKnowledge(agent.id, {
          sourceType: source.sourceType,
          title: source.title,
          content: source.content,
          uri: source.uri,
        });
      }

      await api.userAgents.deploy(agent.id, deployModes);

      if (showMarketplace && listingTitle) {
        await api.marketplace.createListing({
          agentId: agent.id,
          title: listingTitle,
          description: listingDescription,
          pricingModel,
          price: Number(price) || 0,
          category,
        });
      }

      return agent;
    },
    onSuccess: (agent) => {
      setCreatedAgent(agent);
      setStep(3);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create agent");
    },
  });

  const canProceedStep0 = name.trim().length > 0;
  const canProceedStep2 = deployModes.length > 0;

  const handleNext = () => {
    setError("");
    if (step === 0 && !canProceedStep0) {
      setError("Entity name is required");
      return;
    }
    if (step === 2) {
      if (!canProceedStep2) {
        setError("Select at least one deployment mode");
        return;
      }
      createMutation.mutate();
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(prev => prev - 1);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-cyan-600/10 border border-white/[0.06] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(79,125,249,0.15),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white" data-testid="text-page-title">Entity Builder</h1>
                <p className="text-gray-400 text-sm" data-testid="text-page-subtitle">Create, train, and deploy your own intelligent entity</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2" data-testid="step-indicators">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isCompleted = i < step;
            return (
              <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted
                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                    : isActive
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-white/[0.04] border-white/[0.08] text-gray-500"
                )} data-testid={`step-indicator-${i}`}>
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-blue-400" : isCompleted ? "text-green-400" : "text-gray-500"
                )}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "absolute hidden",
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="text-error">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="glass-card rounded-xl border border-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Configure Your Agent
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-400 text-xs">Agent Name *</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="My Intelligent Entity"
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    data-testid="input-agent-name"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Persona / Personality</Label>
                  <Textarea
                    value={persona}
                    onChange={e => setPersona(e.target.value)}
                    placeholder="Describe your agent's personality..."
                    rows={3}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white resize-none placeholder:text-gray-600"
                    data-testid="input-persona"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">System Prompt</Label>
                  <Textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    placeholder="Instructions for the agent..."
                    rows={4}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white resize-none placeholder:text-gray-600"
                    data-testid="input-system-prompt"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Model</Label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm"
                    data-testid="select-model"
                  >
                    {MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Provider</Label>
                  <Input
                    value={selectedModel?.provider || ""}
                    readOnly
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-gray-400"
                    data-testid="input-provider"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-400 text-xs mb-2 block">Skills</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SKILLS.map(skill => (
                      <label
                        key={skill}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                          skills.includes(skill)
                            ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                            : "border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/[0.12]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={skills.includes(skill)}
                          onChange={() => toggleSkill(skill)}
                          className="sr-only"
                          data-testid={`checkbox-skill-${skill}`}
                        />
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                          skills.includes(skill) ? "bg-blue-500 border-blue-500" : "border-white/20"
                        )}>
                          {skills.includes(skill) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="capitalize">{skill}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Temperature: {temperature.toFixed(1)}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(Number(e.target.value))}
                    className="w-full mt-2 accent-blue-500"
                    data-testid="slider-temperature"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>0.0 Precise</span>
                    <span>1.0 Creative</span>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Avatar URL</Label>
                  <Input
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    data-testid="input-avatar-url"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Voice ID</Label>
                  <Input
                    value={voiceId}
                    onChange={e => setVoiceId(e.target.value)}
                    placeholder="Optional voice identifier"
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    data-testid="input-voice-id"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Tags (comma separated)</Label>
                  <Input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="ai, assistant, research"
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    data-testid="input-tags"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="glass-card rounded-xl border border-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Knowledge Sources
            </h2>

            {knowledgeSources.length > 0 && (
              <div className="space-y-2">
                {knowledgeSources.map(source => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                    data-testid={`knowledge-source-${source.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400" data-testid={`badge-source-type-${source.id}`}>
                        {source.sourceType}
                      </Badge>
                      <span className="text-sm text-white" data-testid={`text-source-title-${source.id}`}>{source.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeKnowledgeSource(source.id)}
                      className="text-gray-500 hover:text-red-400 h-8 w-8 p-0"
                      data-testid={`button-delete-source-${source.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <h3 className="text-sm font-medium text-gray-300">Add Knowledge Source</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-xs">Source Type</Label>
                  <select
                    value={newSourceType}
                    onChange={e => setNewSourceType(e.target.value)}
                    className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm"
                    data-testid="select-source-type"
                  >
                    {SOURCE_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-400 text-xs">Title</Label>
                  <Input
                    value={newSourceTitle}
                    onChange={e => setNewSourceTitle(e.target.value)}
                    placeholder="Source title"
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    data-testid="input-source-title"
                  />
                </div>
              </div>

              {newSourceType === "text" ? (
                <div>
                  <Label className="text-gray-400 text-xs">Content</Label>
                  <Textarea
                    value={newSourceContent}
                    onChange={e => setNewSourceContent(e.target.value)}
                    placeholder="Paste text content here..."
                    rows={4}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white resize-none placeholder:text-gray-600"
                    data-testid="input-source-content"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-gray-400 text-xs">URI</Label>
                  <Input
                    value={newSourceUri}
                    onChange={e => setNewSourceUri(e.target.value)}
                    placeholder={newSourceType === "link" ? "https://..." : newSourceType === "file" ? "file path or URL" : "discussion ID or URL"}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                    data-testid="input-source-uri"
                  />
                </div>
              )}

              <Button
                onClick={addKnowledgeSource}
                disabled={!newSourceTitle.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                data-testid="button-add-source"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass-card rounded-xl border border-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-400" />
              Deployment Settings
            </h2>

            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Deployment Modes</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEPLOY_MODES.map(mode => (
                  <label
                    key={mode.value}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                      deployModes.includes(mode.value)
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                        : "border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/[0.12]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={deployModes.includes(mode.value)}
                      onChange={() => toggleDeployMode(mode.value)}
                      className="sr-only"
                      data-testid={`checkbox-deploy-${mode.value}`}
                    />
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                      deployModes.includes(mode.value) ? "bg-blue-500 border-blue-500" : "border-white/20"
                    )}>
                      {deployModes.includes(mode.value) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span>{mode.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="max-w-xs">
              <Label className="text-gray-400 text-xs">Rate Limit (requests per minute)</Label>
              <Input
                type="number"
                value={rateLimit}
                onChange={e => setRateLimit(e.target.value)}
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white"
                data-testid="input-rate-limit"
              />
            </div>

            {showMarketplace && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-400" />
                  Marketplace Listing
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400 text-xs">Listing Title</Label>
                    <Input
                      value={listingTitle}
                      onChange={e => setListingTitle(e.target.value)}
                      placeholder="My Intelligent Entity"
                      className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                      data-testid="input-listing-title"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400 text-xs">Category</Label>
                    <Input
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="e.g., productivity, research"
                      className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                      data-testid="input-listing-category"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-gray-400 text-xs">Description</Label>
                    <Textarea
                      value={listingDescription}
                      onChange={e => setListingDescription(e.target.value)}
                      placeholder="Describe what your agent does..."
                      rows={3}
                      className="mt-1 bg-white/[0.04] border-white/[0.08] text-white resize-none placeholder:text-gray-600"
                      data-testid="input-listing-description"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400 text-xs">Pricing Model</Label>
                    <select
                      value={pricingModel}
                      onChange={e => setPricingModel(e.target.value)}
                      className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm"
                      data-testid="select-pricing-model"
                    >
                      <option value="one_time">One Time</option>
                      <option value="subscription">Subscription</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-xs">Price (credits)</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder="0"
                      className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600"
                      data-testid="input-listing-price"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white" data-testid="text-success-title">Agent Created!</h2>
              <p className="text-gray-400 text-sm">
                Your agent <span className="text-white font-medium">{name}</span> has been successfully created and deployed.
              </p>
            </div>

            <div className="glass-card rounded-xl border border-white/5 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Name</span>
                <span className="text-sm text-white" data-testid="text-summary-name">{name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Model</span>
                <span className="text-sm text-white" data-testid="text-summary-model">{selectedModel?.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Provider</span>
                <span className="text-sm text-white" data-testid="text-summary-provider">{selectedModel?.provider}</span>
              </div>
              {skills.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Skills</span>
                  <div className="flex flex-wrap gap-1 justify-end" data-testid="text-summary-skills">
                    {skills.map(s => (
                      <Badge key={s} variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 capitalize">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Knowledge Sources</span>
                <span className="text-sm text-white" data-testid="text-summary-sources">{knowledgeSources.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Deploy Modes</span>
                <div className="flex flex-wrap gap-1 justify-end" data-testid="text-summary-modes">
                  {deployModes.map(m => (
                    <Badge key={m} variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">{m.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
              </div>
              {createdAgent?.id && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Agent ID</span>
                  <span className="text-sm text-white font-mono" data-testid="text-summary-id">{createdAgent.id}</span>
                </div>
              )}
            </div>

            <Button
              onClick={() => navigate("/my-agents")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
              data-testid="button-go-to-agents"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Go to My Entities
            </Button>
          </div>
        )}

        {step < 3 && (
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className="text-gray-400"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8"
              data-testid="button-next"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : step === 2 ? (
                <><Rocket className="w-4 h-4 mr-2" /> Create & Deploy</>
              ) : (
                <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
