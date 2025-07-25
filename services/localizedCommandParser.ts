import { useTranslation } from 'next-i18next';

import { AgentType } from '@/types/agent';

import {
  CommandDefinition,
  CommandExecutionResult,
  CommandParser,
  CommandType,
  ParsedCommand,
} from './commandParser';

/**
 * Localized command mapping structure
 */
interface LocalizedCommandMap {
  [locale: string]: {
    [englishCommand: string]: string[];
  };
}

/**
 * Localized command definition extending base definition
 */
interface LocalizedCommandDefinition extends CommandDefinition {
  localizedNames: { [locale: string]: string };
  localizedDescription: { [locale: string]: string };
  localizedUsage: { [locale: string]: string };
  localizedExamples: { [locale: string]: string[] };
}

/**
 * LocalizedCommandParser - Extends CommandParser with multi-language support
 */
export class LocalizedCommandParser extends CommandParser {
  private static localizedInstance: LocalizedCommandParser;
  private commandMap: LocalizedCommandMap = {};
  private reverseCommandMap: Map<string, string> = new Map(); // Maps localized commands back to English
  private currentLocale: string = 'en';

  private constructor() {
    super();
    this.initializeLocalizedCommands();
  }

  public static getInstance(): LocalizedCommandParser {
    if (!LocalizedCommandParser.localizedInstance) {
      LocalizedCommandParser.localizedInstance = new LocalizedCommandParser();
    }
    return LocalizedCommandParser.localizedInstance;
  }

  /**
   * Set the current locale for command processing
   */
  public setLocale(locale: string): void {
    this.currentLocale = locale;
  }

  /**
   * Initialize localized command mappings
   */
  private initializeLocalizedCommands(): void {
    this.commandMap = {
      // Spanish (es)
      es: {
        search: ['buscar', 'busqueda', 'search'],
        code: ['codigo', 'código', 'programar', 'code'],
        url: ['url', 'enlace', 'pagina', 'página'],
        knowledge: ['conocimiento', 'saber', 'documentos', 'knowledge'],
        standard: ['estándar', 'estandar', 'normal', 'standard'],
        noAgents: ['sinAgentes', 'sin_agentes', 'noAgents'],
        temperature: ['temperatura', 'creatividad', 'temperature'],
        model: ['modelo', 'model'],
        disableAgents: [
          'desactivarAgentes',
          'desactivar_agentes',
          'disableAgents',
        ],
        enableAgents: ['activarAgentes', 'activar_agentes', 'enableAgents'],
        help: ['ayuda', 'help'],
        settings: ['configuración', 'configuracion', 'ajustes', 'settings'],
        privacyPolicy: [
          'políticaPrivacidad',
          'politica_privacidad',
          'privacidad',
          'privacyPolicy',
        ],
      },

      // French (fr)
      fr: {
        search: ['recherche', 'chercher', 'search'],
        code: ['code', 'programmer', 'codage'],
        url: ['url', 'lien', 'page'],
        knowledge: ['connaissance', 'savoir', 'documents', 'knowledge'],
        standard: ['standard', 'normal'],
        noAgents: ['sansAgents', 'sans_agents', 'noAgents'],
        temperature: ['température', 'temperature', 'créativité'],
        model: ['modèle', 'model'],
        disableAgents: [
          'désactiverAgents',
          'desactiver_agents',
          'disableAgents',
        ],
        enableAgents: ['activerAgents', 'activer_agents', 'enableAgents'],
        help: ['aide', 'help'],
        settings: ['paramètres', 'parametres', 'configuration', 'settings'],
        privacyPolicy: [
          'politiqueConfidentialité',
          'politique_confidentialite',
          'confidentialité',
          'privacyPolicy',
        ],
      },

      // German (de)
      de: {
        search: ['suchen', 'suche', 'search'],
        code: ['code', 'programmieren', 'kode'],
        url: ['url', 'link', 'seite'],
        knowledge: ['wissen', 'kenntnisse', 'dokumente', 'knowledge'],
        standard: ['standard', 'normal'],
        noAgents: ['keineAgenten', 'keine_agenten', 'noAgents'],
        temperature: ['temperatur', 'temperature', 'kreativität'],
        model: ['modell', 'model'],
        disableAgents: [
          'agentenDeaktivieren',
          'agenten_deaktivieren',
          'disableAgents',
        ],
        enableAgents: [
          'agentenAktivieren',
          'agenten_aktivieren',
          'enableAgents',
        ],
        help: ['hilfe', 'help'],
        settings: ['einstellungen', 'konfiguration', 'settings'],
        privacyPolicy: [
          'datenschutz',
          'datenschutzrichtlinie',
          'privacyPolicy',
        ],
      },

      // Chinese Simplified (zh)
      zh: {
        search: ['搜索', '查找', 'search'],
        code: ['代码', '编程', 'code'],
        url: ['链接', '网址', 'url'],
        knowledge: ['知识', '文档', 'knowledge'],
        standard: ['标准', '普通', 'standard'],
        noAgents: ['无代理', '禁用代理', 'noAgents'],
        temperature: ['温度', '创造性', 'temperature'],
        model: ['模型', 'model'],
        disableAgents: ['禁用代理', '关闭代理', 'disableAgents'],
        enableAgents: ['启用代理', '开启代理', 'enableAgents'],
        help: ['帮助', 'help'],
        settings: ['设置', '配置', 'settings'],
        privacyPolicy: ['隐私政策', '隐私', 'privacyPolicy'],
      },

      // Japanese (ja)
      ja: {
        search: ['検索', '探す', 'search'],
        code: ['コード', 'プログラム', 'code'],
        url: ['リンク', 'URL', 'url'],
        knowledge: ['知識', '文書', 'knowledge'],
        standard: ['標準', '通常', 'standard'],
        noAgents: ['エージェント無し', 'エージェント禁止', 'noAgents'],
        temperature: ['温度', '創造性', 'temperature'],
        model: ['モデル', 'model'],
        disableAgents: [
          'エージェント無効',
          'エージェント停止',
          'disableAgents',
        ],
        enableAgents: ['エージェント有効', 'エージェント開始', 'enableAgents'],
        help: ['ヘルプ', '助け', 'help'],
        settings: ['設定', '構成', 'settings'],
        privacyPolicy: [
          'プライバシーポリシー',
          'プライバシー',
          'privacyPolicy',
        ],
      },
    };

    // Build reverse mapping for command resolution
    this.buildReverseCommandMap();
  }

  /**
   * Build reverse command mapping for localized command resolution
   */
  private buildReverseCommandMap(): void {
    this.reverseCommandMap.clear();

    Object.entries(this.commandMap).forEach(([locale, commands]) => {
      Object.entries(commands).forEach(
        ([englishCommand, localizedCommands]) => {
          localizedCommands.forEach((localizedCommand) => {
            const key = `${locale}:${localizedCommand.toLowerCase()}`;
            this.reverseCommandMap.set(key, englishCommand);
          });
        },
      );
    });
  }

  /**
   * Parse input with localization support
   */
  public parseLocalizedInput(
    input: string,
    locale?: string,
    context?: any,
  ): ParsedCommand | null {
    const activeLocale = locale || this.currentLocale;
    const trimmedInput = input.trim();

    // Check if input starts with a slash
    if (!trimmedInput.startsWith('/')) {
      return null;
    }

    // Extract command and arguments
    const parts = trimmedInput.slice(1).split(/\s+/);
    const localizedCommand = parts[0].toLowerCase();
    const args = parts.slice(1);

    // First try to resolve as English command
    let englishCommand = localizedCommand;

    // If not English, try to resolve through localized mapping
    if (activeLocale !== 'en') {
      const key = `${activeLocale}:${localizedCommand}`;
      const resolvedCommand = this.reverseCommandMap.get(key);
      if (resolvedCommand) {
        englishCommand = resolvedCommand;
      }
    }

    // Parse using the resolved English command
    const mockEnglishInput = `/${englishCommand} ${args.join(' ')}`.trim();
    const parsedCommand = super.parseInput(mockEnglishInput, context);

    if (parsedCommand) {
      // Update the original input to maintain user's original command
      parsedCommand.originalInput = input;
      return parsedCommand;
    }

    return null;
  }

  /**
   * Get localized command suggestions
   */
  public getLocalizedCommandSuggestions(
    partialCommand: string,
    locale?: string,
  ): LocalizedCommandDefinition[] {
    const activeLocale = locale || this.currentLocale;
    const partial = partialCommand.toLowerCase();

    // Get base suggestions
    const baseSuggestions = super.getCommandSuggestions(partialCommand);

    // If English locale, return base suggestions
    if (activeLocale === 'en') {
      return baseSuggestions.map((cmd) =>
        this.localizeCommandDefinition(cmd, activeLocale),
      );
    }

    // For other locales, also include localized command names
    const localizedSuggestions: LocalizedCommandDefinition[] = [];
    const localeCommands = this.commandMap[activeLocale];

    if (localeCommands) {
      Object.entries(localeCommands).forEach(
        ([englishCommand, localizedCommands]) => {
          const matchingLocalized = localizedCommands.filter((cmd) =>
            cmd.toLowerCase().startsWith(partial),
          );

          if (matchingLocalized.length > 0) {
            const baseCommand = super
              .getAvailableCommands()
              .find((cmd) => cmd.command === englishCommand);

            if (baseCommand) {
              localizedSuggestions.push(
                this.localizeCommandDefinition(baseCommand, activeLocale),
              );
            }
          }
        },
      );
    }

    // Combine and deduplicate
    const allSuggestions = [
      ...baseSuggestions.map((cmd) =>
        this.localizeCommandDefinition(cmd, activeLocale),
      ),
      ...localizedSuggestions,
    ];
    const uniqueSuggestions = allSuggestions.filter(
      (cmd, index, array) =>
        array.findIndex((c) => c.command === cmd.command) === index,
    );

    return uniqueSuggestions;
  }

  /**
   * Get all localized commands for a specific locale
   */
  public getLocalizedCommands(locale?: string): LocalizedCommandDefinition[] {
    const activeLocale = locale || this.currentLocale;
    const baseCommands = super.getAvailableCommands();

    return baseCommands.map((cmd) =>
      this.localizeCommandDefinition(cmd, activeLocale),
    );
  }

  /**
   * Localize a command definition
   */
  private localizeCommandDefinition(
    command: CommandDefinition,
    locale: string,
  ): LocalizedCommandDefinition {
    const localizedNames: { [locale: string]: string } = {
      en: command.command,
    };
    const localizedDescription: { [locale: string]: string } = {
      en: command.description,
    };
    const localizedUsage: { [locale: string]: string } = { en: command.usage };
    const localizedExamples: { [locale: string]: string[] } = {
      en: command.examples,
    };

    // Add localized versions if available
    if (this.commandMap[locale] && this.commandMap[locale][command.command]) {
      localizedNames[locale] = this.commandMap[locale][command.command][0]; // Use first localized name as primary
    }

    // Add localized descriptions, usage, and examples
    // These would typically come from translation files
    localizedDescription[locale] = this.getLocalizedDescription(
      command.command,
      locale,
    );
    localizedUsage[locale] = this.getLocalizedUsage(command.command, locale);
    localizedExamples[locale] = this.getLocalizedExamples(
      command.command,
      locale,
    );

    return {
      ...command,
      localizedNames,
      localizedDescription,
      localizedUsage,
      localizedExamples,
    };
  }

  /**
   * Get localized description for a command
   */
  private getLocalizedDescription(command: string, locale: string): string {
    const descriptions: { [locale: string]: { [command: string]: string } } = {
      es: {
        search: 'Forzar el agente de búsqueda web para el mensaje actual',
        code: 'Forzar el agente intérprete de código para el mensaje actual',
        url: 'Forzar el agente de extracción de URL para el mensaje actual',
        knowledge:
          'Forzar el agente de conocimiento local para el mensaje actual',
        standard: 'Forzar chat estándar (sin agentes) para el mensaje actual',
        noAgents: 'Desactivar todos los agentes para el mensaje actual',
        temperature:
          'Establecer la creatividad/temperatura para las respuestas (0.0 a 1.0)',
        model: 'Cambiar el modelo de IA que se está utilizando',
        disableAgents: 'Desactivar todos los agentes para mensajes futuros',
        enableAgents: 'Activar agentes para mensajes futuros',
        help: 'Mostrar comandos disponibles e información de uso',
        settings: 'Abrir el diálogo de configuración',
        privacyPolicy:
          'Abrir diálogo de configuración y navegar a la política de privacidad',
      },
      fr: {
        search: "Forcer l'agent de recherche web pour le message actuel",
        code: "Forcer l'agent interpréteur de code pour le message actuel",
        url: "Forcer l'agent d'extraction d'URL pour le message actuel",
        knowledge:
          "Forcer l'agent de connaissance locale pour le message actuel",
        standard:
          'Forcer le chat standard (sans agents) pour le message actuel',
        noAgents: 'Désactiver tous les agents pour le message actuel',
        temperature:
          'Définir la créativité/température pour les réponses (0.0 à 1.0)',
        model: 'Changer le modèle IA utilisé',
        disableAgents: 'Désactiver tous les agents pour les messages futurs',
        enableAgents: 'Activer les agents pour les messages futurs',
        help: "Afficher les commandes disponibles et les informations d'utilisation",
        settings: 'Ouvrir le dialogue des paramètres',
        privacyPolicy:
          'Ouvrir le dialogue des paramètres et naviguer vers la politique de confidentialité',
      },
      de: {
        search: 'Web-Such-Agent für die aktuelle Nachricht erzwingen',
        code: 'Code-Interpreter-Agent für die aktuelle Nachricht erzwingen',
        url: 'URL-Extraktions-Agent für die aktuelle Nachricht erzwingen',
        knowledge: 'Lokalen Wissens-Agent für die aktuelle Nachricht erzwingen',
        standard:
          'Standard-Chat (ohne Agenten) für die aktuelle Nachricht erzwingen',
        noAgents: 'Alle Agenten für die aktuelle Nachricht deaktivieren',
        temperature:
          'Kreativität/Temperatur für Antworten einstellen (0.0 bis 1.0)',
        model: 'Das verwendete KI-Modell wechseln',
        disableAgents: 'Alle Agenten für zukünftige Nachrichten deaktivieren',
        enableAgents: 'Agenten für zukünftige Nachrichten aktivieren',
        help: 'Verfügbare Befehle und Nutzungsinformationen anzeigen',
        settings: 'Einstellungsdialog öffnen',
        privacyPolicy:
          'Einstellungsdialog öffnen und zur Datenschutzrichtlinie navigieren',
      },
      zh: {
        search: '强制使用网络搜索代理处理当前消息',
        code: '强制使用代码解释器代理处理当前消息',
        url: '强制使用URL提取代理处理当前消息',
        knowledge: '强制使用本地知识代理处理当前消息',
        standard: '强制使用标准聊天（无代理）处理当前消息',
        noAgents: '为当前消息禁用所有代理',
        temperature: '设置响应的创造性/温度值（0.0到1.0）',
        model: '切换正在使用的AI模型',
        disableAgents: '为未来消息禁用所有代理',
        enableAgents: '为未来消息启用代理',
        help: '显示可用命令和使用信息',
        settings: '打开设置对话框',
        privacyPolicy: '打开设置对话框并导航到隐私政策',
      },
      ja: {
        search: '現在のメッセージにWeb検索エージェントを強制使用',
        code: '現在のメッセージにコードインタープリターエージェントを強制使用',
        url: '現在のメッセージにURL抽出エージェントを強制使用',
        knowledge: '現在のメッセージにローカル知識エージェントを強制使用',
        standard:
          '現在のメッセージに標準チャット（エージェントなし）を強制使用',
        noAgents: '現在のメッセージのすべてのエージェントを無効化',
        temperature: 'レスポンスの創造性/温度を設定（0.0から1.0）',
        model: '使用中のAIモデルを切り替え',
        disableAgents: '今後のメッセージのすべてのエージェントを無効化',
        enableAgents: '今後のメッセージのエージェントを有効化',
        help: '利用可能なコマンドと使用情報を表示',
        settings: '設定ダイアログを開く',
        privacyPolicy: '設定ダイアログを開きプライバシーポリシーに移動',
      },
    };

    return (
      descriptions[locale]?.[command] ||
      descriptions.en?.[command] ||
      'Command description not available'
    );
  }

  /**
   * Get localized usage for a command
   */
  private getLocalizedUsage(command: string, locale: string): string {
    const usages: { [locale: string]: { [command: string]: string } } = {
      es: {
        search: '/buscar <consulta>',
        code: '/codigo <consulta>',
        url: '/url <consulta>',
        knowledge: '/conocimiento <consulta>',
        standard: '/estándar <consulta>',
        noAgents: '/sinAgentes <consulta>',
        temperature: '/temperatura <valor>',
        model: '/modelo <nombre_modelo>',
        disableAgents: '/desactivarAgentes',
        enableAgents: '/activarAgentes',
        help: '/ayuda [comando]',
        settings: '/configuración',
        privacyPolicy: '/políticaPrivacidad',
      },
      fr: {
        search: '/recherche <requête>',
        code: '/code <requête>',
        url: '/url <requête>',
        knowledge: '/connaissance <requête>',
        standard: '/standard <requête>',
        noAgents: '/sansAgents <requête>',
        temperature: '/température <valeur>',
        model: '/modèle <nom_modèle>',
        disableAgents: '/désactiverAgents',
        enableAgents: '/activerAgents',
        help: '/aide [commande]',
        settings: '/paramètres',
        privacyPolicy: '/politiqueConfidentialité',
      },
      de: {
        search: '/suchen <anfrage>',
        code: '/code <anfrage>',
        url: '/url <anfrage>',
        knowledge: '/wissen <anfrage>',
        standard: '/standard <anfrage>',
        noAgents: '/keineAgenten <anfrage>',
        temperature: '/temperatur <wert>',
        model: '/modell <modellname>',
        disableAgents: '/agentenDeaktivieren',
        enableAgents: '/agentenAktivieren',
        help: '/hilfe [befehl]',
        settings: '/einstellungen',
        privacyPolicy: '/datenschutz',
      },
      zh: {
        search: '/搜索 <查询>',
        code: '/代码 <查询>',
        url: '/链接 <查询>',
        knowledge: '/知识 <查询>',
        standard: '/标准 <查询>',
        noAgents: '/无代理 <查询>',
        temperature: '/温度 <值>',
        model: '/模型 <模型名称>',
        disableAgents: '/禁用代理',
        enableAgents: '/启用代理',
        help: '/帮助 [命令]',
        settings: '/设置',
        privacyPolicy: '/隐私政策',
      },
      ja: {
        search: '/検索 <クエリ>',
        code: '/コード <クエリ>',
        url: '/リンク <クエリ>',
        knowledge: '/知識 <クエリ>',
        standard: '/標準 <クエリ>',
        noAgents: '/エージェント無し <クエリ>',
        temperature: '/温度 <値>',
        model: '/モデル <モデル名>',
        disableAgents: '/エージェント無効',
        enableAgents: '/エージェント有効',
        help: '/ヘルプ [コマンド]',
        settings: '/設定',
        privacyPolicy: '/プライバシーポリシー',
      },
    };

    const localizedUsage = usages[locale]?.[command];
    if (localizedUsage) return localizedUsage;

    // Fallback to English with localized command name if available
    const localizedName = this.commandMap[locale]?.[command]?.[0];
    if (localizedName) {
      const englishUsage = usages.en?.[command] || `/${command} <query>`;
      return englishUsage.replace(`/${command}`, `/${localizedName}`);
    }

    return usages.en?.[command] || `/${command} <query>`;
  }

  /**
   * Get localized examples for a command
   */
  private getLocalizedExamples(command: string, locale: string): string[] {
    const examples: { [locale: string]: { [command: string]: string[] } } = {
      es: {
        search: ['/buscar últimos desarrollos de IA', '/buscar clima hoy'],
        code: [
          '/codigo analizar esta función',
          '/codigo escribir un script de Python',
        ],
        url: [
          '/url resumir https://ejemplo.com',
          '/url extraer contenido de esta página',
        ],
        knowledge: [
          '/conocimiento encontrar documentos sobre',
          '/conocimiento buscar docs internos',
        ],
        standard: [
          '/estándar solo charlar normalmente',
          '/estándar conversación básica',
        ],
        noAgents: [
          '/sinAgentes pregunta simple',
          '/sinAgentes respuesta básica necesaria',
        ],
        temperature: [
          '/temperatura 0.7',
          '/temperatura conservador',
          '/temperatura creativo',
        ],
        model: ['/modelo gpt-4', '/modelo gpt-3.5-turbo', '/modelo claude-3'],
        disableAgents: ['/desactivarAgentes'],
        enableAgents: ['/activarAgentes'],
        help: ['/ayuda', '/ayuda temperatura', '/ayuda buscar'],
        settings: ['/configuración'],
        privacyPolicy: ['/políticaPrivacidad'],
      },
      // Add more locales as needed...
    };

    return examples[locale]?.[command] || [`/${command} example usage`];
  }

  /**
   * Get user's preferred command names for the current locale
   */
  public getPreferredCommandName(
    englishCommand: string,
    locale?: string,
  ): string {
    const activeLocale = locale || this.currentLocale;

    if (activeLocale === 'en' || !this.commandMap[activeLocale]) {
      return englishCommand;
    }

    const localizedCommands = this.commandMap[activeLocale][englishCommand];
    return localizedCommands?.[0] || englishCommand;
  }
}

export default LocalizedCommandParser;
