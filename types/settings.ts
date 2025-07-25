import { AgentType } from './agent';
import { OpenAIModel } from './openai';

export interface Settings {
  theme: 'light' | 'dark';
  temperature: number;
  systemPrompt: string;
  advancedMode: boolean;
  agentSettings?: AgentSettings;
  model?: OpenAIModel;
}

export interface AgentSettings {
  enabled: boolean;
  confidenceThreshold: number;
  fallbackEnabled: boolean;
  enabledAgentTypes: AgentType[];
  agentConfigurations: Record<AgentType, AgentConfiguration>;
  preferences: AgentPreferences;
  privacy?: PrivacySettings;
  security?: SecuritySettings;
  performance?: PerformanceSettings;
  ui?: UICustomizationSettings;
  routing?: RoutingPreferences;
}

export interface AgentConfiguration {
  enabled: boolean;
  priority: number;
  timeout: number;
  maxRetries: number;
  confidenceThreshold?: number; // Agent-specific confidence threshold
  parameters: Record<string, any>;
  // Enhanced configuration options
  securityLevel?: 'strict' | 'normal' | 'permissive';
  resourceLimits?: {
    maxMemoryMb?: number;
    maxExecutionTime?: number;
    maxConcurrentOperations?: number;
  };
  contentFilters?: {
    allowedDomains?: string[];
    blockedDomains?: string[];
    contentTypes?: string[];
    safeSearch?: 'strict' | 'moderate' | 'off';
  };
}

export interface AgentPreferences {
  preferredAgents: AgentType[];
  disabledAgents: AgentType[];
  autoRouting: boolean;
  showAgentAttribution: boolean;
  confirmBeforeAgentUse: boolean;
  // Enhanced preferences
  routingStrategy?: 'performance' | 'accuracy' | 'cost' | 'balanced';
  fallbackChain?: AgentType[];
  maxRetryAttempts?: number;
  enableCaching?: boolean;
}

export interface PrivacySettings {
  dataRetention: {
    searchHistory: number; // days, 0 = disabled
    conversationData: number; // days, 0 = disabled
    agentResults: number; // days, 0 = disabled
    citations: number; // days, 0 = disabled
  };
  dataSharing: {
    allowAnalytics: boolean;
    allowPerformanceMetrics: boolean;
    allowErrorReporting: boolean;
    shareWithExternalServices: boolean;
    allowCrossConversationData: boolean;
  };
  privacy: {
    pseudonymizeData: boolean;
    enableLocalProcessing: boolean;
    requireExplicitConsent: boolean;
    allowProfileBuilding: boolean;
  };
}

export interface SecuritySettings {
  permissions: {
    allowCodeExecution: boolean;
    allowFileSystemAccess: boolean;
    allowNetworkAccess: boolean;
    allowExternalApiCalls: boolean;
    allowScreenCapture: boolean;
  };
  restrictions: {
    trustedDomains: string[];
    blockedDomains: string[];
    allowedFileTypes: string[];
    maxUploadSize: number; // MB
    requireSandboxing: boolean;
  };
  authentication: {
    requireReauth: boolean;
    reauthInterval: number; // minutes
    enable2FA: boolean;
    sessionTimeout: number; // minutes
  };
  audit: {
    enableAuditLogging: boolean;
    logLevel: 'minimal' | 'standard' | 'detailed';
    retainAuditLogs: number; // days
  };
}

export interface PerformanceSettings {
  resources: {
    maxConcurrentAgents: number;
    maxMemoryUsage: number; // MB
    maxBandwidthUsage: number; // MB/s
    enableBackgroundProcessing: boolean;
  };
  caching: {
    enableResultCaching: boolean;
    cacheSize: number; // MB
    cacheRetention: number; // hours
    enablePrefetching: boolean;
  };
  optimization: {
    enableCompression: boolean;
    optimizeForBattery: boolean;
    preferLocalProcessing: boolean;
    enableParallelProcessing: boolean;
  };
  limits: {
    requestTimeout: number; // seconds
    maxRequestsPerMinute: number;
    maxResultSize: number; // MB
  };
}

export interface UICustomizationSettings {
  display: {
    showAgentIndicators: boolean;
    showProcessingTime: boolean;
    showConfidenceScores: boolean;
    showTokenUsage: boolean;
    compactMode: boolean;
  };
  animations: {
    enableLoadingAnimations: boolean;
    enableTransitions: boolean;
    animationSpeed: 'slow' | 'normal' | 'fast';
    reduceMotion: boolean;
  };
  citations: {
    citationStyle: 'inline' | 'footnotes' | 'sidebar';
    showThumbnails: boolean;
    showPreview: boolean;
    enableHover: boolean;
  };
  themes: {
    agentColorCoding: boolean;
    customColors: Record<AgentType, string>;
    enableDarkMode: boolean;
    highContrast: boolean;
  };
}

export interface RoutingPreferences {
  defaultAgent: AgentType | 'auto';
  routingRules: RoutingRule[];
  fallbackBehavior: {
    enableAutoFallback: boolean;
    fallbackChain: AgentType[];
    maxFallbackAttempts: number;
  };
  performance: {
    preferFastResponse: boolean;
    tolerateHigherCosts: boolean;
    prioritizeAccuracy: boolean;
  };
  contextual: {
    enableSmartRouting: boolean;
    considerUserHistory: boolean;
    adaptToDeviceCapabilities: boolean;
  };
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: {
    queryType?: 'question' | 'command' | 'search' | 'analysis';
    keywords?: string[];
    language?: string;
    userRole?: string;
  };
  action: {
    targetAgent: AgentType;
    priority: number;
    parameters?: Record<string, any>;
  };
  enabled: boolean;
}
