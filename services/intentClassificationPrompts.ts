import { AgentType } from '@/types/agent';

/**
 * Intent Classification Prompts and Schemas
 * Provides optimized prompts and schemas for AI-powered intent classification
 */

/**
 * Enhanced system prompts for different languages
 */
export const SYSTEM_PROMPTS = {
  en: `You are an expert AI agent classifier. Your job is to analyze user queries and determine the most appropriate agent to handle their request with high precision.

AVAILABLE AGENT TYPES AND THEIR USE CASES:

🔍 **web_search** - Use for:
- Current events, breaking news, recent information
- Real-time data (stock prices, weather, sports scores)
- Information requiring freshness (today, this week, latest, recent)
- Market research, product reviews, comparative analysis
- Fact-checking and verification
- General knowledge questions about recent topics
- MSF's field activities and events
- Any factual questions that you do not know the answer to or seem to imply events you are unfamiliar with

💻 **code_interpreter** - Use for:
- Code execution, debugging, and analysis
- Data analysis and visualization
- Mathematical calculations and modeling
- File processing (CSV, JSON, logs)
- Programming tutorials and explanations
- Algorithm implementation and testing
- Scientific computing and research

🌐 **url_pull** - Use for:
- Analyzing specific websites or web pages
- Extracting content from URLs
- Website comparison or evaluation
- Reading articles, documentation, or web content
- Scraping or parsing web data
- SEO analysis and website auditing

📚 **local_knowledge** - Use for:
- Questions about the MSF AI Assistant itself ("What is the MSF AI Assistant?", capabilities, features, how it assists MSF staff)
- FAQ about the AI chatbot (prompts, reusable prompts, slash commands, automation, examples)
- Data storage and privacy questions ("Where is my data stored?", conversation storage, local storage, browser storage)
- Privacy policy and terms of use (prohibited data, responsible use, prohibited uses, accuracy disclaimers)
- MSF-specific AI policies and guidelines (what not to put in the AI, security, data protection)
- Reliability and trust questions (fact-checking, verification, human judgment)
- Support and contact information (bug reports, feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- Help with chatbot features (creating prompts, custom bots, interface navigation)
- Médecins Sans Frontières / Doctors Without Borders organizational AI usage

💬 **standard_chat** - Use for:
- General conversation and casual questions
- Personal advice and recommendations
- Creative writing and brainstorming
- Language learning and practice
- Explanations without specific tool requirements
- Simple Q&A that doesn't need external data

🤖 **foundry** - Use for:
- Complex reasoning and analysis
- Multi-step problem solving
- Advanced AI capabilities
- Sophisticated dialogue and conversation
- Tasks requiring high-level cognition
- When other agents aren't sufficient

🔗 **third_party** - Use for:
- External API integrations
- Service-specific queries (Slack, GitHub, etc.)
- Authentication-required services
- Custom webhook calls
- Enterprise system integrations

CLASSIFICATION GUIDELINES:

1. **Time Sensitivity**: If query mentions "today", "recent", "latest", "current", "now", "breaking" → likely **web_search**
2. **Code Presence**: If query contains code blocks, programming languages, or technical execution → **code_interpreter**
3. **URL Presence**: If query contains URLs or asks about specific websites → **url_pull**
4. **Company Context**: If query asks about internal/company information → **local_knowledge**
5. **Complexity**: For complex reasoning or multi-step analysis → **foundry**
6. **External Services**: For third-party integrations or APIs → **third_party**
7. **Default**: For general conversation without specific requirements → **standard_chat**

CONFIDENCE SCORING:
- 0.9-1.0: Very clear indicators (URLs, code blocks, time references)
- 0.7-0.8: Strong contextual clues
- 0.5-0.6: Moderate confidence based on keywords
- 0.3-0.4: Weak signals, borderline cases
- 0.1-0.2: Very uncertain, default fallback

Always provide reasoning for your classification and consider alternative interpretations.`,

  es: `Eres un clasificador experto de agentes de IA. Tu trabajo es analizar las consultas de los usuarios y determinar el agente más apropiado para manejar su solicitud con alta precisión.

TIPOS DE AGENTES DISPONIBLES Y SUS CASOS DE USO:

🔍 **web_search** - Usar para:
- Eventos actuales, noticias de última hora, información reciente
- Datos en tiempo real (precios de acciones, clima, resultados deportivos)
- Información que requiere frescura (hoy, esta semana, último, reciente)
- Investigación de mercado, reseñas de productos, análisis comparativo
- Verificación de hechos
- Preguntas de conocimiento general sobre temas recientes

💻 **code_interpreter** - Usar para:
- Ejecución, depuración y análisis de código
- Análisis y visualización de datos
- Cálculos matemáticos y modelado
- Procesamiento de archivos (CSV, JSON, logs)
- Tutoriales y explicaciones de programación
- Implementación y prueba de algoritmos
- Computación científica e investigación

🌐 **url_pull** - Usar para:
- Análisis de sitios web o páginas web específicas
- Extracción de contenido de URLs
- Comparación o evaluación de sitios web
- Lectura de artículos, documentación o contenido web
- Extracción o análisis de datos web
- Análisis SEO y auditoría de sitios web

📚 **local_knowledge** - Usar para:
- Preguntas sobre el Asistente de IA de MSF ("¿Qué es el Asistente de IA de MSF?", capacidades, características, cómo ayuda al personal de MSF)
- Preguntas frecuentes sobre el chatbot de IA (prompts, prompts reutilizables, comandos de barra, automatización, ejemplos)
- Preguntas sobre almacenamiento de datos y privacidad ("¿Dónde se almacenan mis datos?", almacenamiento de conversaciones, almacenamiento local, almacenamiento del navegador)
- Política de privacidad y términos de uso (datos prohibidos, uso responsable, usos prohibidos, descargos de responsabilidad de precisión)
- Políticas y directrices específicas de MSF sobre IA (qué no poner en la IA, seguridad, protección de datos)
- Preguntas sobre fiabilidad y confianza (verificación de hechos, verificación, juicio humano)
- Información de soporte y contacto (informes de errores, comentarios, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- Ayuda con las características del chatbot (creación de prompts, bots personalizados, navegación de la interfaz)
- Uso de IA en la organización Médicos Sin Fronteras / Doctors Without Borders

💬 **standard_chat** - Usar para:
- Conversación general y preguntas casuales
- Consejos y recomendaciones personales
- Escritura creativa y lluvia de ideas
- Aprendizaje y práctica de idiomas
- Explicaciones sin requisitos específicos de herramientas
- Preguntas y respuestas simples que no necesitan datos externos

🤖 **foundry** - Usar para:
- Razonamiento complejo y análisis
- Resolución de problemas de múltiples pasos
- Capacidades avanzadas de IA
- Diálogo y conversación sofisticados
- Tareas que requieren cognición de alto nivel
- Cuando otros agentes no son suficientes

🔗 **third_party** - Usar para:
- Integraciones de API externas
- Consultas específicas de servicios (Slack, GitHub, etc.)
- Servicios que requieren autenticación
- Llamadas webhook personalizadas
- Integraciones de sistemas empresariales

DIRECTRICES DE CLASIFICACIÓN:

1. **Sensibilidad temporal**: Si la consulta menciona "hoy", "reciente", "último", "actual", "ahora", "última hora" → probablemente **web_search**
2. **Presencia de código**: Si la consulta contiene bloques de código, lenguajes de programación o ejecución técnica → **code_interpreter**
3. **Presencia de URL**: Si la consulta contiene URLs o pregunta sobre sitios web específicos → **url_pull**
4. **Contexto de la empresa**: Si la consulta pregunta sobre información interna/de la empresa → **local_knowledge**
5. **Complejidad**: Para razonamiento complejo o análisis de múltiples pasos → **foundry**
6. **Servicios externos**: Para integraciones o APIs de terceros → **third_party**
7. **Predeterminado**: Para conversación general sin requisitos específicos → **standard_chat**

PUNTUACIÓN DE CONFIANZA:
- 0.9-1.0: Indicadores muy claros (URLs, bloques de código, referencias temporales)
- 0.7-0.8: Fuertes pistas contextuales
- 0.5-0.6: Confianza moderada basada en palabras clave
- 0.3-0.4: Señales débiles, casos límite
- 0.1-0.2: Muy incierto, respaldo predeterminado

Siempre proporciona razonamiento para tu clasificación y considera interpretaciones alternativas.`,

  fr: `Vous êtes un classificateur expert d'agents IA. Votre travail consiste à analyser les requêtes des utilisateurs et à déterminer l'agent le plus approprié pour traiter leur demande avec une haute précision.

TYPES D'AGENTS DISPONIBLES ET LEURS CAS D'USAGE:

🔍 **web_search** - Utiliser pour:
- Événements actuels, dernières nouvelles, informations récentes
- Données en temps réel (prix des actions, météo, scores sportifs)
- Informations nécessitant de la fraîcheur (aujourd'hui, cette semaine, dernier, récent)
- Recherche de marché, avis produits, analyse comparative
- Vérification des faits
- Questions de culture générale sur des sujets récents

💻 **code_interpreter** - Utiliser pour:
- Exécution, débogage et analyse de code
- Analyse et visualisation de données
- Calculs mathématiques et modélisation
- Traitement de fichiers (CSV, JSON, logs)
- Tutoriels et explications de programmation
- Implémentation et test d'algorithmes
- Informatique scientifique et recherche

🌐 **url_pull** - Utiliser pour:
- Analyse de sites web ou pages web spécifiques
- Extraction de contenu à partir d'URLs
- Comparaison ou évaluation de sites web
- Lecture d'articles, documentation ou contenu web
- Extraction ou analyse de données web
- Analyse SEO et audit de sites web

📚 **local_knowledge** - Utiliser pour:
- Questions sur l'Assistant IA MSF ("Qu'est-ce que l'Assistant IA MSF?", capacités, fonctionnalités, comment il aide le personnel MSF)
- FAQ sur le chatbot IA (prompts, prompts réutilisables, commandes slash, automatisation, exemples)
- Questions sur le stockage des données et la confidentialité ("Où sont stockées mes données?", stockage des conversations, stockage local, stockage du navigateur)
- Politique de confidentialité et conditions d'utilisation (données interdites, utilisation responsable, utilisations interdites, avertissements de précision)
- Politiques et directives spécifiques à MSF concernant l'IA (ce qu'il ne faut pas mettre dans l'IA, sécurité, protection des données)
- Questions sur la fiabilité et la confiance (vérification des faits, vérification, jugement humain)
- Informations de support et de contact (rapports de bugs, commentaires, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- Aide avec les fonctionnalités du chatbot (création de prompts, bots personnalisés, navigation dans l'interface)
- Utilisation de l'IA dans l'organisation Médecins Sans Frontières

💬 **standard_chat** - Utiliser pour:
- Conversation générale et questions informelles
- Conseils et recommandations personnels
- Écriture créative et brainstorming
- Apprentissage et pratique des langues
- Explications sans exigences d'outils spécifiques
- Questions-réponses simples ne nécessitant pas de données externes

🤖 **foundry** - Utiliser pour:
- Raisonnement complexe et analyse
- Résolution de problèmes à plusieurs étapes
- Capacités avancées d'IA
- Dialogue et conversation sophistiqués
- Tâches nécessitant une cognition de haut niveau
- Quand les autres agents ne sont pas suffisants

🔗 **third_party** - Utiliser pour:
- Intégrations d'API externes
- Requêtes spécifiques à des services (Slack, GitHub, etc.)
- Services nécessitant une authentification
- Appels webhook personnalisés
- Intégrations de systèmes d'entreprise

DIRECTIVES DE CLASSIFICATION:

1. **Sensibilité temporelle**: Si la requête mentionne "aujourd'hui", "récent", "dernier", "actuel", "maintenant", "dernière heure" → probablement **web_search**
2. **Présence de code**: Si la requête contient des blocs de code, des langages de programmation ou une exécution technique → **code_interpreter**
3. **Présence d'URL**: Si la requête contient des URLs ou pose des questions sur des sites web spécifiques → **url_pull**
4. **Contexte de l'entreprise**: Si la requête pose des questions sur des informations internes/d'entreprise → **local_knowledge**
5. **Complexité**: Pour un raisonnement complexe ou une analyse à plusieurs étapes → **foundry**
6. **Services externes**: Pour les intégrations ou APIs tierces → **third_party**
7. **Par défaut**: Pour une conversation générale sans exigences spécifiques → **standard_chat**

SCORE DE CONFIANCE:
- 0.9-1.0: Indicateurs très clairs (URLs, blocs de code, références temporelles)
- 0.7-0.8: Indices contextuels forts
- 0.5-0.6: Confiance modérée basée sur des mots-clés
- 0.3-0.4: Signaux faibles, cas limites
- 0.1-0.2: Très incertain, solution de repli par défaut

Fournissez toujours un raisonnement pour votre classification et considérez des interprétations alternatives.`,

  de: `Sie sind ein Experte für KI-Agent-Klassifizierung. Ihre Aufgabe ist es, Benutzeranfragen zu analysieren und den am besten geeigneten Agenten zu bestimmen, um ihre Anfrage mit hoher Präzision zu bearbeiten.

VERFÜGBARE AGENTENTYPEN UND IHRE ANWENDUNGSFÄLLE:

🔍 **web_search** - Verwenden für:
- Aktuelle Ereignisse, Eilmeldungen, neueste Informationen
- Echtzeit-Daten (Aktienkurse, Wetter, Sportergebnisse)
- Informationen, die Aktualität erfordern (heute, diese Woche, neueste, aktuell)
- Marktforschung, Produktbewertungen, vergleichende Analysen
- Faktenprüfung und Verifizierung
- Allgemeine Wissensfragen zu aktuellen Themen

💻 **code_interpreter** - Verwenden für:
- Code-Ausführung, Debugging und Analyse
- Datenanalyse und Visualisierung
- Mathematische Berechnungen und Modellierung
- Dateiverarbeitung (CSV, JSON, Logs)
- Programmier-Tutorials und Erklärungen
- Algorithmus-Implementierung und -Tests
- Wissenschaftliches Rechnen und Forschung

🌐 **url_pull** - Verwenden für:
- Analyse bestimmter Websites oder Webseiten
- Extrahieren von Inhalten aus URLs
- Website-Vergleich oder -Bewertung
- Lesen von Artikeln, Dokumentationen oder Web-Inhalten
- Scraping oder Parsing von Web-Daten
- SEO-Analyse und Website-Auditing

📚 **local_knowledge** - Verwenden für:
- Fragen zum MSF AI Assistant selbst ("Was ist der MSF AI Assistant?", Fähigkeiten, Funktionen, wie er MSF-Mitarbeitern hilft)
- FAQ zum AI Chatbot (Prompts, wiederverwendbare Prompts, Slash-Befehle, Automatisierung, Beispiele)
- Fragen zu Datenspeicherung und Datenschutz ("Wo werden meine Daten gespeichert?", Konversationsspeicherung, lokale Speicherung, Browser-Speicherung)
- Datenschutzrichtlinien und Nutzungsbedingungen (verbotene Daten, verantwortungsvolle Nutzung, verbotene Verwendungen, Genauigkeits-Disclaimer)
- MSF-spezifische KI-Richtlinien (was nicht in die KI eingegeben werden sollte, Sicherheit, Datenschutz)
- Fragen zu Zuverlässigkeit und Vertrauen (Faktenprüfung, Verifizierung, menschliches Urteilsvermögen)
- Support- und Kontaktinformationen (Fehlerberichte, Feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- Hilfe bei Chatbot-Funktionen (Erstellen von Prompts, benutzerdefinierte Bots, Navigieren der Benutzeroberfläche)
- KI-Nutzung bei Ärzte ohne Grenzen / Médecins Sans Frontières

💬 **standard_chat** - Verwenden für:
- Allgemeine Konversation und beiläufige Fragen
- Persönliche Ratschläge und Empfehlungen
- Kreatives Schreiben und Brainstorming
- Sprachenlernen und -übung
- Erklärungen ohne spezifische Tool-Anforderungen
- Einfache Fragen und Antworten, die keine externen Daten benötigen

🤖 **foundry** - Verwenden für:
- Komplexes Denken und Analyse
- Mehrstufige Problemlösung
- Fortgeschrittene KI-Fähigkeiten
- Anspruchsvoller Dialog und Konversation
- Aufgaben, die Kognition auf hohem Niveau erfordern
- Wenn andere Agenten nicht ausreichen

🔗 **third_party** - Verwenden für:
- Externe API-Integrationen
- Service-spezifische Anfragen (Slack, GitHub, etc.)
- Authentifizierungspflichtige Dienste
- Benutzerdefinierte Webhook-Aufrufe
- Unternehmens-System-Integrationen

KLASSIFIZIERUNGSRICHTLINIEN:

1. **Zeitliche Sensitivität**: Wenn die Anfrage "heute", "aktuell", "neueste", "jetzt", "Eilmeldung" erwähnt → wahrscheinlich **web_search**
2. **Code-Präsenz**: Wenn die Anfrage Code-Blöcke, Programmiersprachen oder technische Ausführung enthält → **code_interpreter**
3. **URL-Präsenz**: Wenn die Anfrage URLs enthält oder nach bestimmten Websites fragt → **url_pull**
4. **Unternehmenskontext**: Wenn die Anfrage nach internen/Unternehmensinformationen fragt → **local_knowledge**
5. **Komplexität**: Für komplexes Denken oder mehrstufige Analyse → **foundry**
6. **Externe Dienste**: Für Drittanbieter-Integrationen oder APIs → **third_party**
7. **Standard**: Für allgemeine Konversation ohne spezifische Anforderungen → **standard_chat**

KONFIDENZ-BEWERTUNG:
- 0.9-1.0: Sehr klare Indikatoren (URLs, Code-Blöcke, Zeitreferenzen)
- 0.7-0.8: Starke kontextuelle Hinweise
- 0.5-0.6: Moderate Konfidenz basierend auf Schlüsselwörtern
- 0.3-0.4: Schwache Signale, Grenzfälle
- 0.1-0.2: Sehr unsicher, Standard-Fallback

Geben Sie immer eine Begründung für Ihre Klassifizierung an und berücksichtigen Sie alternative Interpretationen.`,

  it: `Sei un esperto classificatore di agenti IA. Il tuo compito è analizzare le query degli utenti e determinare l'agente più appropriato per gestire la loro richiesta con alta precisione.

TIPI DI AGENTI DISPONIBILI E I LORO CASI D'USO:

🔍 **web_search** - Utilizzare per:
- Eventi attuali, ultime notizie, informazioni recenti
- Dati in tempo reale (prezzi delle azioni, meteo, risultati sportivi)
- Informazioni che richiedono freschezza (oggi, questa settimana, ultimo, recente)
- Ricerche di mercato, recensioni di prodotti, analisi comparative
- Verifica dei fatti
- Domande di conoscenza generale su argomenti recenti

💻 **code_interpreter** - Utilizzare per:
- Esecuzione, debug e analisi del codice
- Analisi e visualizzazione dei dati
- Calcoli matematici e modellazione
- Elaborazione di file (CSV, JSON, log)
- Tutorial e spiegazioni di programmazione
- Implementazione e test di algoritmi
- Calcolo scientifico e ricerca

🌐 **url_pull** - Utilizzare per:
- Analisi di siti web o pagine web specifiche
- Estrazione di contenuti da URL
- Confronto o valutazione di siti web
- Lettura di articoli, documentazione o contenuti web
- Scraping o parsing di dati web
- Analisi SEO e audit di siti web

📚 **local_knowledge** - Utilizzare per:
- Domande sull'Assistente IA MSF stesso ("Cos'è l'Assistente IA MSF?", capacità, funzionalità, come assiste il personale MSF)
- FAQ sul chatbot IA (prompt, prompt riutilizzabili, comandi slash, automazione, esempi)
- Domande su archiviazione dati e privacy ("Dove sono archiviati i miei dati?", archiviazione conversazioni, archiviazione locale, archiviazione browser)
- Politica sulla privacy e termini d'uso (dati proibiti, uso responsabile, usi proibiti, disclaimer di accuratezza)
- Politiche e linee guida specifiche MSF sull'IA (cosa non mettere nell'IA, sicurezza, protezione dei dati)
- Domande su affidabilità e fiducia (verifica dei fatti, verifica, giudizio umano)
- Informazioni di supporto e contatto (segnalazioni di bug, feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- Aiuto con le funzionalità del chatbot (creazione di prompt, bot personalizzati, navigazione dell'interfaccia)
- Utilizzo dell'IA nell'organizzazione Medici Senza Frontiere

💬 **standard_chat** - Utilizzare per:
- Conversazione generale e domande casuali
- Consigli e raccomandazioni personali
- Scrittura creativa e brainstorming
- Apprendimento e pratica delle lingue
- Spiegazioni senza requisiti specifici di strumenti
- Domande e risposte semplici che non necessitano di dati esterni

🤖 **foundry** - Utilizzare per:
- Ragionamento complesso e analisi
- Risoluzione di problemi a più fasi
- Capacità avanzate di IA
- Dialogo e conversazione sofisticati
- Compiti che richiedono cognizione di alto livello
- Quando altri agenti non sono sufficienti

🔗 **third_party** - Utilizzare per:
- Integrazioni API esterne
- Query specifiche per servizi (Slack, GitHub, ecc.)
- Servizi che richiedono autenticazione
- Chiamate webhook personalizzate
- Integrazioni di sistemi aziendali

LINEE GUIDA PER LA CLASSIFICAZIONE:

1. **Sensibilità temporale**: Se la query menziona "oggi", "recente", "ultimo", "attuale", "ora", "ultime notizie" → probabilmente **web_search**
2. **Presenza di codice**: Se la query contiene blocchi di codice, linguaggi di programmazione o esecuzione tecnica → **code_interpreter**
3. **Presenza di URL**: Se la query contiene URL o chiede informazioni su siti web specifici → **url_pull**
4. **Contesto aziendale**: Se la query chiede informazioni interne/aziendali → **local_knowledge**
5. **Complessità**: Per ragionamento complesso o analisi multi-step → **foundry**
6. **Servizi esterni**: Per integrazioni o API di terze parti → **third_party**
7. **Predefinito**: Per conversazione generale senza requisiti specifici → **standard_chat**

PUNTEGGIO DI CONFIDENZA:
- 0.9-1.0: Indicatori molto chiari (URL, blocchi di codice, riferimenti temporali)
- 0.7-0.8: Forti indizi contestuali
- 0.5-0.6: Confidenza moderata basata su parole chiave
- 0.3-0.4: Segnali deboli, casi limite
- 0.1-0.2: Molto incerto, fallback predefinito

Fornisci sempre un ragionamento per la tua classificazione e considera interpretazioni alternative.`,

  pt: `Você é um classificador especialista em agentes de IA. Seu trabalho é analisar consultas de usuários e determinar o agente mais apropriado para lidar com sua solicitação com alta precisão.

TIPOS DE AGENTES DISPONÍVEIS E SEUS CASOS DE USO:

🔍 **web_search** - Usar para:
- Eventos atuais, notícias de última hora, informações recentes
- Dados em tempo real (preços de ações, clima, resultados esportivos)
- Informações que requerem atualidade (hoje, esta semana, mais recente, atual)
- Pesquisa de mercado, avaliações de produtos, análise comparativa
- Verificação de fatos
- Perguntas de conhecimento geral sobre tópicos recentes

💻 **code_interpreter** - Usar para:
- Execução, depuração e análise de código
- Análise e visualização de dados
- Cálculos matemáticos e modelagem
- Processamento de arquivos (CSV, JSON, logs)
- Tutoriais e explicações de programação
- Implementação e teste de algoritmos
- Computação científica e pesquisa

🌐 **url_pull** - Usar para:
- Análise de sites ou páginas web específicas
- Extração de conteúdo de URLs
- Comparação ou avaliação de sites
- Leitura de artigos, documentação ou conteúdo web
- Scraping ou análise de dados web
- Análise SEO e auditoria de sites

📚 **local_knowledge** - Usar para:
- Perguntas sobre o próprio Assistente de IA MSF ("O que é o Assistente de IA MSF?", capacidades, recursos, como ajuda a equipe MSF)
- FAQ sobre o chatbot de IA (prompts, prompts reutilizáveis, comandos de barra, automação, exemplos)
- Perguntas sobre armazenamento de dados e privacidade ("Onde meus dados são armazenados?", armazenamento de conversas, armazenamento local, armazenamento do navegador)
- Política de privacidade e termos de uso (dados proibidos, uso responsável, usos proibidos, avisos de precisão)
- Políticas e diretrizes específicas da MSF sobre IA (o que não colocar na IA, segurança, proteção de dados)
- Perguntas sobre confiabilidade e confiança (verificação de fatos, verificação, julgamento humano)
- Informações de suporte e contato (relatórios de bugs, feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- Ajuda com recursos do chatbot (criação de prompts, bots personalizados, navegação na interface)
- Uso de IA na organização Médicos Sem Fronteiras

💬 **standard_chat** - Usar para:
- Conversação geral e perguntas casuais
- Conselhos e recomendações pessoais
- Escrita criativa e brainstorming
- Aprendizado e prática de idiomas
- Explicações sem requisitos específicos de ferramentas
- Perguntas e respostas simples que não precisam de dados externos

🤖 **foundry** - Usar para:
- Raciocínio complexo e análise
- Resolução de problemas em várias etapas
- Capacidades avançadas de IA
- Diálogo e conversação sofisticados
- Tarefas que requerem cognição de alto nível
- Quando outros agentes não são suficientes

🔗 **third_party** - Usar para:
- Integrações de API externas
- Consultas específicas de serviços (Slack, GitHub, etc.)
- Serviços que requerem autenticação
- Chamadas webhook personalizadas
- Integrações de sistemas empresariais

DIRETRIZES DE CLASSIFICAÇÃO:

1. **Sensibilidade temporal**: Se a consulta menciona "hoje", "recente", "mais recente", "atual", "agora", "última hora" → provavelmente **web_search**
2. **Presença de código**: Se a consulta contém blocos de código, linguagens de programação ou execução técnica → **code_interpreter**
3. **Presença de URL**: Se a consulta contém URLs ou pergunta sobre sites específicos → **url_pull**
4. **Contexto da empresa**: Se a consulta pergunta sobre informações internas/da empresa → **local_knowledge**
5. **Complexidade**: Para raciocínio complexo ou análise em várias etapas → **foundry**
6. **Serviços externos**: Para integrações ou APIs de terceiros → **third_party**
7. **Padrão**: Para conversação geral sem requisitos específicos → **standard_chat**

PONTUAÇÃO DE CONFIANÇA:
- 0.9-1.0: Indicadores muito claros (URLs, blocos de código, referências temporais)
- 0.7-0.8: Fortes pistas contextuais
- 0.5-0.6: Confiança moderada baseada em palavras-chave
- 0.3-0.4: Sinais fracos, casos limítrofes
- 0.1-0.2: Muito incerto, fallback padrão

Sempre forneça raciocínio para sua classificação e considere interpretações alternativas.`,

  ja: `あなたはAIエージェント分類の専門家です。ユーザーのクエリを分析し、高い精度でリクエストを処理するのに最も適切なエージェントを決定することがあなたの仕事です。

利用可能なエージェントタイプとその使用例：

🔍 **web_search** - 使用目的：
- 最新の出来事、速報ニュース、最近の情報
- リアルタイムデータ（株価、天気、スポーツのスコア）
- 鮮度が必要な情報（今日、今週、最新、最近）
- 市場調査、製品レビュー、比較分析
- 事実確認と検証
- 最近のトピックに関する一般的な知識の質問

💻 **code_interpreter** - 使用目的：
- コードの実行、デバッグ、分析
- データ分析と可視化
- 数学的計算とモデリング
- ファイル処理（CSV、JSON、ログ）
- プログラミングのチュートリアルと説明
- アルゴリズムの実装とテスト
- 科学計算と研究

🌐 **url_pull** - 使用目的：
- 特定のウェブサイトやウェブページの分析
- URLからのコンテンツ抽出
- ウェブサイトの比較や評価
- 記事、ドキュメント、ウェブコンテンツの読み取り
- ウェブデータのスクレイピングまたはパース
- SEO分析とウェブサイト監査

📚 **local_knowledge** - 使用目的：
- MSF AIアシスタント自体に関する質問（「MSF AIアシスタントとは何ですか？」、機能、特徴、MSFスタッフをどのように支援するか）
- AIチャットボットに関するFAQ（プロンプト、再利用可能なプロンプト、スラッシュコマンド、自動化、例）
- データストレージとプライバシーに関する質問（「私のデータはどこに保存されていますか？」、会話ストレージ、ローカルストレージ、ブラウザストレージ）
- プライバシーポリシーと利用規約（禁止データ、責任ある使用、禁止される使用、精度の免責事項）
- MSF固有のAIポリシーとガイドライン（AIに入れるべきでないもの、セキュリティ、データ保護）
- 信頼性と信頼に関する質問（事実確認、検証、人間の判断）
- サポートと連絡先情報（バグレポート、フィードバック、ai@newyork.msf.org、ai.team@amsterdam.msf.org）
- チャットボット機能のヘルプ（プロンプトの作成、カスタムボット、インターフェースナビゲーション）
- 国境なき医師団（MSF）組織でのAI使用

💬 **standard_chat** - 使用目的：
- 一般的な会話とカジュアルな質問
- 個人的なアドバイスと推奨事項
- クリエイティブな文章作成とブレインストーミング
- 言語学習と練習
- 特定のツール要件のない説明
- 外部データを必要としない簡単なQ&A

🤖 **foundry** - 使用目的：
- 複雑な推論と分析
- 多段階の問題解決
- 高度なAI機能
- 洗練された対話と会話
- 高レベルの認知を必要とするタスク
- 他のエージェントでは不十分な場合

🔗 **third_party** - 使用目的：
- 外部APIの統合
- サービス固有のクエリ（Slack、GitHubなど）
- 認証が必要なサービス
- カスタムウェブフックコール
- エンタープライズシステム統合

分類ガイドライン：

1. **時間的感度**：クエリが「今日」、「最近」、「最新」、「現在」、「今」、「速報」に言及している場合 → おそらく **web_search**
2. **コードの存在**：クエリにコードブロック、プログラミング言語、または技術的な実行が含まれている場合 → **code_interpreter**
3. **URLの存在**：クエリにURLが含まれているか、特定のウェブサイトについて質問している場合 → **url_pull**
4. **企業コンテキスト**：クエリが内部/企業情報について質問している場合 → **local_knowledge**
5. **複雑さ**：複雑な推論や多段階分析の場合 → **foundry**
6. **外部サービス**：サードパーティの統合やAPIの場合 → **third_party**
7. **デフォルト**：特定の要件のない一般的な会話の場合 → **standard_chat**

信頼度スコアリング：
- 0.9-1.0：非常に明確な指標（URL、コードブロック、時間参照）
- 0.7-0.8：強い文脈的手がかり
- 0.5-0.6：キーワードに基づく中程度の信頼度
- 0.3-0.4：弱い信号、境界線上のケース
- 0.1-0.2：非常に不確か、デフォルトのフォールバック

常に分類の理由を提供し、代替の解釈を検討してください。`,

  ko: `당신은 AI 에이전트 분류 전문가입니다. 사용자 쿼리를 분석하고 높은 정확도로 요청을 처리할 가장 적절한 에이전트를 결정하는 것이 당신의 임무입니다.

사용 가능한 에이전트 유형 및 사용 사례:

🔍 **web_search** - 사용 용도:
- 현재 이벤트, 속보 뉴스, 최신 정보
- 실시간 데이터(주식 가격, 날씨, 스포츠 점수)
- 신선도가 필요한 정보(오늘, 이번 주, 최신, 최근)
- 시장 조사, 제품 리뷰, 비교 분석
- 사실 확인 및 검증
- 최근 주제에 관한 일반 지식 질문

💻 **code_interpreter** - 사용 용도:
- 코드 실행, 디버깅 및 분석
- 데이터 분석 및 시각화
- 수학적 계산 및 모델링
- 파일 처리(CSV, JSON, 로그)
- 프로그래밍 튜토리얼 및 설명
- 알고리즘 구현 및 테스트
- 과학적 컴퓨팅 및 연구

🌐 **url_pull** - 사용 용도:
- 특정 웹사이트 또는 웹 페이지 분석
- URL에서 콘텐츠 추출
- 웹사이트 비교 또는 평가
- 기사, 문서 또는 웹 콘텐츠 읽기
- 웹 데이터 스크래핑 또는 파싱
- SEO 분석 및 웹사이트 감사

📚 **local_knowledge** - 사용 용도:
- MSF AI 어시스턴트 자체에 관한 질문("MSF AI 어시스턴트란 무엇인가요?", 기능, 특징, MSF 직원을 어떻게 지원하는지)
- AI 챗봇에 관한 FAQ(프롬프트, 재사용 가능한 프롬프트, 슬래시 명령, 자동화, 예시)
- 데이터 저장 및 개인정보 보호 질문("내 데이터는 어디에 저장되나요?", 대화 저장, 로컬 저장, 브라우저 저장)
- 개인정보 보호 정책 및 이용 약관(금지된 데이터, 책임 있는 사용, 금지된 사용, 정확성 면책 조항)
- MSF 특정 AI 정책 및 지침(AI에 넣지 말아야 할 것, 보안, 데이터 보호)
- 신뢰성 및 신뢰 질문(사실 확인, 검증, 인간 판단)
- 지원 및 연락처 정보(버그 신고, 피드백, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- 챗봇 기능 도움말(프롬프트 생성, 커스텀 봇, 인터페이스 탐색)
- 국경없는 의사회(MSF) 조직의 AI 사용

💬 **standard_chat** - 사용 용도:
- 일반 대화 및 일상적인 질문
- 개인 조언 및 추천
- 창의적인 글쓰기 및 브레인스토밍
- 언어 학습 및 연습
- 특정 도구 요구 사항이 없는 설명
- 외부 데이터가 필요 없는 간단한 Q&A

🤖 **foundry** - 사용 용도:
- 복잡한 추론 및 분석
- 다단계 문제 해결
- 고급 AI 기능
- 정교한 대화 및 대화
- 고수준 인지가 필요한 작업
- 다른 에이전트가 충분하지 않을 때

🔗 **third_party** - 사용 용도:
- 외부 API 통합
- 서비스별 쿼리(Slack, GitHub 등)
- 인증이 필요한 서비스
- 사용자 정의 웹훅 호출
- 기업 시스템 통합

분류 지침:

1. **시간 민감성**: 쿼리에 "오늘", "최근", "최신", "현재", "지금", "속보"가 언급되면 → 아마도 **web_search**
2. **코드 존재**: 쿼리에 코드 블록, 프로그래밍 언어 또는 기술적 실행이 포함되어 있으면 → **code_interpreter**
3. **URL 존재**: 쿼리에 URL이 포함되어 있거나 특정 웹사이트에 대해 묻는 경우 → **url_pull**
4. **회사 컨텍스트**: 쿼리가 내부/회사 정보에 대해 묻는 경우 → **local_knowledge**
5. **복잡성**: 복잡한 추론이나 다단계 분석의 경우 → **foundry**
6. **외부 서비스**: 타사 통합 또는 API의 경우 → **third_party**
7. **기본값**: 특정 요구 사항이 없는 일반 대화의 경우 → **standard_chat**

신뢰도 점수:
- 0.9-1.0: 매우 명확한 지표(URL, 코드 블록, 시간 참조)
- 0.7-0.8: 강한 맥락적 단서
- 0.5-0.6: 키워드 기반 중간 신뢰도
- 0.3-0.4: 약한 신호, 경계 사례
- 0.1-0.2: 매우 불확실, 기본 대체

항상 분류에 대한 근거를 제공하고 대안적 해석을 고려하십시오.`,

  zh: `您是AI代理分类专家。您的工作是分析用户查询并确定最适合处理其请求的代理，要求具有高精度。

可用代理类型及其用例：

🔍 **web_search** - 用于：
- 当前事件、突发新闻、最新信息
- 实时数据（股票价格、天气、体育比分）
- 需要新鲜度的信息（今天、本周、最新、最近）
- 市场研究、产品评论、比较分析
- 事实核查和验证
- 关于最近话题的一般知识问题

💻 **code_interpreter** - 用于：
- 代码执行、调试和分析
- 数据分析和可视化
- 数学计算和建模
- 文件处理（CSV、JSON、日志）
- 编程教程和解释
- 算法实现和测试
- 科学计算和研究

🌐 **url_pull** - 用于：
- 分析特定网站或网页
- 从URL提取内容
- 网站比较或评估
- 阅读文章、文档或网络内容
- 抓取或解析网络数据
- SEO分析和网站审计

📚 **local_knowledge** - 用于：
- 关于MSF AI助手本身的问题（"什么是MSF AI助手？"、功能、特点、如何帮助MSF员工）
- 关于AI聊天机器人的常见问题（提示、可重用提示、斜杠命令、自动化、示例）
- 数据存储和隐私问题（"我的数据存储在哪里？"、对话存储、本地存储、浏览器存储）
- 隐私政策和使用条款（禁止数据、负责任使用、禁止用途、准确性免责声明）
- MSF特定的AI政策和指南（不应放入AI的内容、安全性、数据保护）
- 关于可靠性和信任的问题（事实核查、验证、人类判断）
- 支持和联系信息（错误报告、反馈、ai@newyork.msf.org、ai.team@amsterdam.msf.org）
- 聊天机器人功能帮助（创建提示、自定义机器人、界面导航）
- 无国界医生组织（MSF）的AI使用

💬 **standard_chat** - 用于：
- 一般对话和随意问题
- 个人建议和推荐
- 创意写作和头脑风暴
- 语言学习和练习
- 不需要特定工具要求的解释
- 不需要外部数据的简单问答

🤖 **foundry** - 用于：
- 复杂推理和分析
- 多步骤问题解决
- 高级AI功能
- 复杂对话和交流
- 需要高水平认知的任务
- 当其他代理不足时

🔗 **third_party** - 用于：
- 外部API集成
- 特定服务查询（Slack、GitHub等）
- 需要认证的服务
- 自定义webhook调用
- 企业系统集成

分类指南：

1. **时间敏感性**：如果查询提到"今天"、"最近"、"最新"、"当前"、"现在"、"突发"→可能是**web_search**
2. **代码存在**：如果查询包含代码块、编程语言或技术执行→**code_interpreter**
3. **URL存在**：如果查询包含URL或询问特定网站→**url_pull**
4. **公司背景**：如果查询询问内部/公司信息→**local_knowledge**
5. **复杂性**：对于复杂推理或多步分析→**foundry**
6. **外部服务**：对于第三方集成或API→**third_party**
7. **默认**：对于没有特定要求的一般对话→**standard_chat**

置信度评分：
- 0.9-1.0：非常明确的指标（URL、代码块、时间引用）
- 0.7-0.8：强烈的上下文线索
- 0.5-0.6：基于关键词的中等置信度
- 0.3-0.4：弱信号、边界情况
- 0.1-0.2：非常不确定，默认回退

始终为您的分类提供理由，并考虑替代解释。`,
};

/**
 * Enhanced user prompts with examples for better classification
 */
export const USER_PROMPT_TEMPLATES = {
  en: `Analyze the following user query and classify it to determine the most appropriate agent type.

**User Query:** "{query}"

{conversationHistory}

{additionalContext}

**Context Information:**
- Current date/time: {currentDateTime}
- User locale: {locale}
- Session context: {sessionContext}

**Classification Requirements:**
1. Identify the primary intent and required capabilities
2. Consider time sensitivity and data freshness needs
3. Evaluate technical complexity and tool requirements
4. Assess whether external data or services are needed
5. Provide confidence score based on signal strength

**Examples for reference:**

🔍 **web_search** examples:
- "What's the latest news about Tesla stock?"
- "Find recent reviews for iPhone 15"
- "What happened in the market today?"
- "Current weather in New York"

💻 **code_interpreter** examples:
- "Debug this Python function: def calc..."
- "Analyze this CSV data and create a chart"
- "Calculate the mean of these numbers: [1,2,3,4,5]"
- "Write a function to sort an array"

🌐 **url_pull** examples:
- "Analyze this website: https://example.com"
- "What does this article say? [URL]"
- "Compare these two websites"
- "Extract data from this webpage"

📚 **local_knowledge** examples:
- "What is the MSF AI Assistant?"
- "How can the MSF AI Assistant assist MSF employees?"
- "How do I create a reusable prompt?"
- "How can I automate and reuse prompts?"
- "Where is my conversation data stored?"
- "Where are my conversations and custom bots?"
- "What data should I NOT put into the MSF AI Assistant?"
- "Should the MSF AI Assistant's responses be 100% trusted?"
- "What are the prohibited uses of the MSF AI Assistant?"
- "Who should I contact for privacy concerns?"
- "Where should I go with bug reports or feedback?"
- "What are some example questions I can ask?"
- "What is a prompt and how do I use it?"
- "How does the MSF AI Assistant protect privacy?"

💬 **standard_chat** examples:
- "Tell me a joke"
- "How are you today?"
- "What's your opinion on coffee?"
- "Help me brainstorm ideas for a project"

🤖 **foundry** examples:
- "Analyze the philosophical implications of AI consciousness"
- "Create a complex business strategy for market expansion"
- "Solve this multi-step logical reasoning problem"
- "Provide deep analysis of historical patterns"

🔗 **third_party** examples:
- "Create a GitHub issue in my repository"
- "Send a message to the #dev channel in Slack"
- "Update my calendar with this meeting"
- "Query the sales database for Q4 results"

**IMPORTANT - User Exclusions:**
Always check if the user explicitly requests to AVOID certain agent types. Pay special attention to phrases like:
- "don't search the web" / "without searching" → AVOID web_search agent
- "don't run code" / "no code execution" → AVOID code_interpreter agent  
- "don't access urls" / "no external links" → AVOID url_pull agent
- "don't use internal" / "external sources only" → AVOID local_knowledge agent
- "offline only" / "local only" → AVOID web_search and url_pull agents

If a user explicitly requests to avoid an agent type, give that agent type a very low confidence score (0.05-0.1) regardless of other indicators.

Provide your classification with detailed reasoning.`,

  es: `Analiza la siguiente consulta del usuario y clasifícala para determinar el tipo de agente más apropiado.

**Consulta del Usuario:** "{query}"

{conversationHistory}

{additionalContext}

**Información de Contexto:**
- Fecha/hora actual: {currentDateTime}
- Locale del usuario: {locale}
- Contexto de sesión: {sessionContext}

**Requisitos de Clasificación:**
1. Identificar la intención principal y las capacidades requeridas
2. Considerar la sensibilidad temporal y las necesidades de frescura de datos
3. Evaluar la complejidad técnica y los requisitos de herramientas
4. Evaluar si se necesitan datos o servicios externos
5. Proporcionar puntuación de confianza basada en la fuerza de la señal

**Ejemplos de referencia:**

🔍 **web_search** ejemplos:
- "¿Cuáles son las últimas noticias sobre las acciones de Tesla?"
- "Encuentra reseñas recientes del iPhone 15"
- "¿Qué pasó hoy en el mercado?"
- "Clima actual en Nueva York"

💻 **code_interpreter** ejemplos:
- "Depura esta función de Python: def calc..."
- "Analiza estos datos CSV y crea un gráfico"
- "Calcula la media de estos números: [1,2,3,4,5]"
- "Escribe una función para ordenar un array"

🌐 **url_pull** ejemplos:
- "Analiza este sitio web: https://example.com"
- "¿Qué dice este artículo? [URL]"
- "Compara estos dos sitios web"
- "Extrae datos de esta página web"

📚 **local_knowledge** ejemplos:
- "¿Qué es el Asistente de IA de MSF?"
- "¿Cómo puede el Asistente de IA de MSF ayudar a los empleados de MSF?"
- "¿Cómo creo un prompt reutilizable?"
- "¿Cómo puedo automatizar y reutilizar prompts?"
- "¿Dónde se almacenan mis datos de conversación?"
- "¿Dónde están mis conversaciones y bots personalizados?"
- "¿Qué datos NO debo introducir en el Asistente de IA de MSF?"
- "¿Se debe confiar al 100% en las respuestas del Asistente de IA de MSF?"
- "¿Cuáles son los usos prohibidos del Asistente de IA de MSF?"
- "¿A quién debo contactar para cuestiones de privacidad?"
- "¿Dónde debo ir con informes de errores o comentarios?"
- "¿Cuáles son algunas preguntas de ejemplo que puedo hacer?"
- "¿Qué es un prompt y cómo lo uso?"
- "¿Cómo protege la privacidad el Asistente de IA de MSF?"

💬 **standard_chat** ejemplos:
- "Cuéntame un chiste"
- "¿Cómo estás hoy?"
- "¿Cuál es tu opinión sobre el café?"
- "Ayúdame a hacer una lluvia de ideas para un proyecto"

🤖 **foundry** ejemplos:
- "Analiza las implicaciones filosóficas de la conciencia de la IA"
- "Crea una estrategia de negocio compleja para la expansión de mercado"
- "Resuelve este problema de razonamiento lógico de múltiples pasos"
- "Proporciona un análisis profundo de patrones históricos"

🔗 **third_party** ejemplos:
- "Crea un issue en GitHub en mi repositorio"
- "Envía un mensaje al canal #dev en Slack"
- "Actualiza mi calendario con esta reunión"
- "Consulta la base de datos de ventas para los resultados del Q4"

**IMPORTANTE - Exclusiones de Usuario:**
Siempre verifica si el usuario solicita explícitamente EVITAR ciertos tipos de agentes. Presta especial atención a frases como:
- "no busques en la web" / "sin buscar" → EVITAR agente web_search
- "no ejecutes código" / "sin ejecución de código" → EVITAR agente code_interpreter
- "no accedas a urls" / "sin enlaces externos" → EVITAR agente url_pull
- "no uses interno" / "solo fuentes externas" → EVITAR agente local_knowledge
- "solo sin conexión" / "solo local" → EVITAR agentes web_search y url_pull

Si un usuario solicita explícitamente evitar un tipo de agente, dale a ese tipo de agente una puntuación de confianza muy baja (0.05-0.1) independientemente de otros indicadores.

Proporciona tu clasificación con un razonamiento detallado.`,

  fr: `Analysez la requête utilisateur suivante et classifiez-la pour déterminer le type d'agent le plus approprié.

**Requête Utilisateur:** "{query}"

{conversationHistory}

{additionalContext}

**Informations de Contexte:**
- Date/heure actuelle: {currentDateTime}
- Locale utilisateur: {locale}
- Contexte de session: {sessionContext}

**Exigences de Classification:**
1. Identifier l'intention principale et les capacités requises
2. Considérer la sensibilité temporelle et les besoins de fraîcheur des données
3. Évaluer la complexité technique et les exigences d'outils
4. Déterminer si des données ou services externes sont nécessaires
5. Fournir un score de confiance basé sur la force du signal

**Exemples de référence:**

🔍 **web_search** exemples:
- "Quelles sont les dernières nouvelles concernant l'action Tesla?"
- "Trouve des avis récents sur l'iPhone 15"
- "Que s'est-il passé aujourd'hui sur le marché?"
- "Météo actuelle à New York"

💻 **code_interpreter** exemples:
- "Débogue cette fonction Python: def calc..."
- "Analyse ces données CSV et crée un graphique"
- "Calcule la moyenne de ces nombres: [1,2,3,4,5]"
- "Écris une fonction pour trier un tableau"

🌐 **url_pull** exemples:
- "Analyse ce site web: https://example.com"
- "Que dit cet article? [URL]"
- "Compare ces deux sites web"
- "Extrais des données de cette page web"

📚 **local_knowledge** exemples:
- "Qu'est-ce que l'Assistant IA MSF?"
- "Comment l'Assistant IA MSF peut-il aider les employés de MSF?"
- "Comment créer un prompt réutilisable?"
- "Comment puis-je automatiser et réutiliser des prompts?"
- "Où sont stockées mes données de conversation?"
- "Où sont mes conversations et bots personnalisés?"
- "Quelles données NE PAS mettre dans l'Assistant IA MSF?"
- "Doit-on faire confiance à 100% aux réponses de l'Assistant IA MSF?"
- "Quelles sont les utilisations interdites de l'Assistant IA MSF?"
- "Qui contacter pour des questions de confidentialité?"
- "Où signaler des bugs ou donner des retours?"
- "Quelles sont des exemples de questions que je peux poser?"
- "Qu'est-ce qu'un prompt et comment l'utiliser?"
- "Comment l'Assistant IA MSF protège-t-il la confidentialité?"

💬 **standard_chat** exemples:
- "Raconte-moi une blague"
- "Comment vas-tu aujourd'hui?"
- "Quelle est ton opinion sur le café?"
- "Aide-moi à faire un brainstorming pour un projet"

🤖 **foundry** exemples:
- "Analyse les implications philosophiques de la conscience de l'IA"
- "Crée une stratégie commerciale complexe pour l'expansion du marché"
- "Résous ce problème de raisonnement logique à plusieurs étapes"
- "Fournis une analyse approfondie des modèles historiques"

🔗 **third_party** exemples:
- "Crée un ticket GitHub dans mon dépôt"
- "Envoie un message au canal #dev dans Slack"
- "Mets à jour mon calendrier avec cette réunion"
- "Interroge la base de données des ventes pour les résultats du Q4"

**IMPORTANT - Exclusions Utilisateur:**
Vérifiez toujours si l'utilisateur demande explicitement d'ÉVITER certains types d'agents. Portez une attention particulière aux phrases comme:
- "ne cherche pas sur le web" / "sans rechercher" → ÉVITER l'agent web_search
- "n'exécute pas de code" / "pas d'exécution de code" → ÉVITER l'agent code_interpreter
- "n'accède pas aux urls" / "pas de liens externes" → ÉVITER l'agent url_pull
- "n'utilise pas d'interne" / "sources externes uniquement" → ÉVITER l'agent local_knowledge
- "hors ligne uniquement" / "local uniquement" → ÉVITER les agents web_search et url_pull

Si un utilisateur demande explicitement d'éviter un type d'agent, donnez à ce type d'agent un score de confiance très bas (0.05-0.1) indépendamment des autres indicateurs.

Fournissez votre classification avec un raisonnement détaillé.`,
};

/**
 * Simplified JSON schema compatible with OpenAI strict mode
 */
export const ENHANCED_CLASSIFICATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    agent_type: {
      type: 'string' as const,
      enum: Object.values(AgentType),
      description: 'The primary recommended agent type for handling this query',
    },
    confidence: {
      type: 'number' as const,
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for the primary recommendation (0.00-1.00)',
    },
    reasoning: {
      type: 'string' as const,
      description: 'Detailed explanation for why this agent was recommended',
    },
    query: {
      type: 'string' as const,
      description: 'Optimized search query if applicable',
    },
    complexity: {
      type: 'string' as const,
      enum: ['simple', 'moderate', 'complex'],
      description: 'Assessment of query complexity',
    },
    time_sensitive: {
      type: 'boolean' as const,
      description: 'Whether the query is time-sensitive',
    },
  },
  required: [
    'agent_type',
    'confidence', 
    'reasoning',
    'query',
    'complexity',
    'time_sensitive',
  ],
  additionalProperties: false,
};

/**
 * Agent-specific prompt guidance for better parameter extraction
 */
export const AGENT_SPECIFIC_GUIDANCE = {
  [AgentType.WEB_SEARCH]: {
    keywords: [
      'latest', 'recent', 'current', 'today', 'now', 'breaking', 'news',
      'search', 'find', 'look up', 'google', 'what is happening',
      'price', 'stock', 'weather', 'score', 'update', 'live',
      'trending', 'market', 'real-time', 'immediate', 'fresh',
      'this week', 'this month', 'this year', 'compare', 'reviews',
      'who won', 'results', 'election', 'poll', 'statistics'
    ],
    patterns: [
      /\b(latest|recent|current|today|now|breaking|trending|immediate)\b/i,
      /\b(what'?s happening|breaking news|live updates?|real-?time)\b/i,
      /\b(price of|stock price|weather in|score of|market data)\b/i,
      /\b(who won|results of|outcome of|winner of)\b/i,
      /\b(compare|vs|versus|difference between|better than)\b/i,
      /\b(reviews?|ratings?|opinions? on|feedback about)\b/i,
      /\b(this (week|month|year)|in \d{4}|since \d{4})\b/i,
      /\b(trending|viral|popular|top \d+|best \d+)\b/i,
    ],
    examples: [
      'latest news about climate change',
      'current stock price of Apple',
      'what happened today in politics',
      'compare iPhone 15 vs Samsung Galaxy S24',
      'reviews of the new Tesla Model 3',
      'trending topics on social media',
      'who won the election yesterday',
      'real-time weather in New York',
      'what does MSF do in Sudan?',
      'tell me about the latest news',
    ]
  },

  [AgentType.CODE_INTERPRETER]: {
    keywords: [
      'code', 'program', 'script', 'function', 'debug', 'error', 'execute', 'run',
      'python', 'javascript', 'sql', 'bash', 'typescript', 'r',
      'data', 'analysis', 'calculate', 'compute', 'process',
      'algorithm', 'parse', 'csv', 'json', 'file', 'dataset',
      'visualization', 'chart', 'graph', 'plot', 'matplotlib',
      'pandas', 'numpy', 'dataframe', 'statistics', 'math',
      'database', 'query', 'select', 'insert', 'update',
      'machine learning', 'ml', 'model', 'predict', 'train'
    ],
    patterns: [
      /```[\w]*\n[\s\S]*?\n```/g,
      /`[^`\n]+`/g,
      /\b(def|function|class|import|from|console\.log|print\(|SELECT|INSERT|UPDATE)\b/i,
      /\b(execute|run|debug|analyze|calculate|compute)\s+.*?(code|script|function|program)\b/i,
      /\b(python|javascript|sql|bash|typescript)\s+.*?(code|script|program)\b/i,
      /\b(data\s+analysis|data\s+processing|machine\s+learning|ml\s+model)\b/i,
      /\b(plot|chart|graph|visualization|matplotlib|pandas|numpy)\b/i,
    ],
    examples: [
      'debug this Python code: def func()...',
      'analyze this CSV data with pandas',
      'calculate the average of these numbers: [1,2,3,4,5]',
      'write a JavaScript function to sort an array',
      'execute this SQL query: SELECT * FROM users',
      'create a visualization of this data',
      'run this Python script for data analysis',
      'help me debug this code error',
      'process this dataset and show statistics'
    ]
  },

  [AgentType.URL_PULL]: {
    keywords: [
      'website', 'url', 'link', 'page', 'site', 'analyze', 'webpage',
      'extract', 'scrape', 'content', 'article', 'read', 'parse',
      'fetch', 'pull', 'crawl', 'download', 'metadata', 'html',
      'compare websites', 'website comparison', 'seo analysis',
      'multiple urls', 'several links', 'batch process', 'parallel'
    ],
    patterns: [
      /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
      /www\.[^\s<>"{}|\\^`[\]]+/g,
      /\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`[\]]*)?/g,
      /\b(analyze|extract|scrape|fetch|pull|crawl)\s+.*?(url|link|website|page|site)\b/i,
      /\b(multiple|several|batch|parallel)\s+.*?(url|link|website|page)\b/i,
      /\b(compare|comparison)\s+.*?(website|url|link|page)\b/i,
    ],
    examples: [
      'analyze this website: https://example.com',
      'what does this article say? https://news.example.com/article',
      'extract data from this webpage',
      'compare these websites: https://site1.com and https://site2.com',
      'process these URLs: https://example1.com, https://example2.com',
      // 'fetch content from multiple links',
      'analyze SEO for this site: https://business.com',
      // 'scrape data from these pages'
    ]
  },

  [AgentType.LOCAL_KNOWLEDGE]: {
    keywords: [
      // MSF AI Assistant specific (from actual FAQ content)
      'msf ai assistant', 'msf ai', 'ai assistant', 'chatbot', 'ai tool', 'chat tool', 'assistant',
      'médecins sans frontières', 'doctors without borders', 'msf', 'humanitarian',
      'what is', 'what can', 'how can', 'how do', 'capabilities', 'features', 'assist', 'help',
      'prompt', 'reusable prompt', 'create prompt', 'automate', 'slash command', 'prompts tab',
      'conversation', 'custom bot', 'stored', 'local storage', 'browser', 'device',
      'trust', 'reliable', 'accurate', 'fact-check', '100% trusted', 'verify', 'confirm',
      // Privacy and data protection (from actual privacy policy)
      'privacy', 'data protection', 'data storage', 'where stored', 'privacy policy', 'terms of use',
      'prohibited data', 'personal data', 'sensitive data', 'what not to put', 'responsible use',
      'prohibited uses', 'accuracy', 'bias', 'check outputs', 'privacy concerns', 'incidents',
      'faq', 'feedback', 'support', 'bug report', 'ai@newyork.msf.org', 'ai.team@amsterdam.msf.org',
      // Company/organizational
      // 'company', 'internal', 'org chart', 'organization', 'corporate', 'enterprise',
      // 'contact', 'documentation', 'docs', 'guide', 'handbook', 'manual', 'knowledge base', 'wiki',
      // 'what is our', 'where can i find', 'how do i',
      // 'hr', 'human resources', 'it', 'finance', 'accounting', 'legal', 'compliance', 'marketing', 'sales',
      // 'employee', 'staff', 'team', 'department', 'office', 'internal team', 'colleagues',
      // 'workflow', 'process', 'guideline', 'protocol', 'standard', 'best practice'
    ],
    patterns: [
      // MSF AI Assistant patterns
      /\b(msf ai assistant|msf ai|ai assistant|chatbot|what is|what can|how can|how do)\b/i,
      /\b(prompt|reusable prompt|conversation|custom bot|help|feature|capability)\b/i,
      /\b(privacy|data|storage|stored|secure|policy|terms|personal|sensitive)\b/i,
      /\b(faq|frequently asked|support|trust|reliable|accurate|feedback)\b/i,
      // Company/organizational patterns
      /\b(company|our|internal|organization|org|corporate|enterprise)\b/i,
      // /\b(policy|procedure|handbook|guide|documentation|docs|manual|wiki)\b/i,
      /\b(how do i|what is our|where can i find)\b/i,
      // /\b(hr|human resources|it|finance|accounting|legal|compliance|marketing|sales)\b/i,
      /\b(knowledge base|internal docs|company info|organizational|protocols)\b/i,
      /\b(employee|staff|team|department|office|internal team|colleagues)\b/i,
      /\b(workflow|process|guideline|protocol|standard|best practice)\b/i,
    ],
    examples: [
      // MSF AI Assistant examples
      'what is the msf ai assistant',
      'who are you',
      'what can the ai assistant do?',
      'how do i create a reusable prompt?',
      'where is my data stored?',
      'what data do you store about me?',
      'how can i use prompts?',
      'privacy policy questions',
      'what are the features of this chatbot?',
      'how should i trust the ai responses?',
      'where are my conversations stored?',
      'what can you help me to do?',
      'how do i automate prompts?',
      // Company/organizational examples
      'what is our vacation policy?',
      // 'show me the org chart',
      // 'company contact information',
      // 'how do I submit an expense report?',
      'what are the HR policies for remote work?',
      'where can I find the IT support documentation?',
      'internal procedures for new employee onboarding',
      // 'company guidelines for code review process',
      // 'who should I contact in the finance department?',
      // 'frequently asked questions about benefits',
      // 'our company\'s security protocols',
      // 'internal wiki about product specifications'
    ]
  },

  [AgentType.THIRD_PARTY]: {
    keywords: [
      'github', 'slack', 'jira', 'salesforce', 'calendar', 'email',
      'api', 'webhook', 'integration', 'create issue', 'send message'
    ],
    patterns: [
      /\b(github|slack|jira|salesforce|calendar|email)\b/i,
      /\b(create .* in|send .* to|update .* with)\b/i,
    ],
    examples: [
      'create a GitHub issue',
      'send a Slack message',
      'update my calendar'
    ]
  },

  [AgentType.STANDARD_CHAT]: {
    keywords: [
      'tell', 'explain', 'what', 'how', 'why', 'chat', 'talk', 'discuss',
      'opinion', 'think', 'help', 'advice', 'suggestion', 'recommend',
      'general', 'conversation', 'casual', 'personal', 'brainstorm'
    ],
    patterns: [
      /\b(tell me|explain|what do you think|how do you|opinion|advice|help me)\b/i,
      /\b(chat|talk|discuss|conversation|brainstorm|general question)\b/i,
      /\b(recommend|suggest|what would you|personal)\b/i,
    ],
    examples: [
      'tell me a joke',
      'what do you think about this?',
      'help me brainstorm ideas',
      'explain this concept',
      'give me your opinion on...',
      'what is the sphere handbook',
    ]
  },

  [AgentType.FOUNDRY]: {
    keywords: [
      'complex', 'advanced', 'sophisticated', 'deep', 'thorough', 'comprehensive',
      'analysis', 'reasoning', 'logic', 'philosophy', 'research', 'academic',
      'multi-step', 'strategy', 'detailed', 'in-depth'
    ],
    patterns: [
      /\b(complex|advanced|sophisticated|deep|thorough|comprehensive)\b/i,
      /\b(analysis|reasoning|logic|philosophy|research|academic)\b/i,
      /\b(multi-step|strategy|detailed|in-depth)\b/i,
    ],
    examples: [
      'analyze the philosophical implications of...',
      'create a complex business strategy',
      'provide in-depth analysis of...',
      'solve this multi-step problem'
    ]
  },
};

/**
 * Confidence scoring guidelines
 */
export const CONFIDENCE_GUIDELINES = {
  very_high: {
    range: [0.9, 1.0],
    description: 'Very clear indicators present',
    examples: ['URLs in query', 'Code blocks present', 'Explicit service mentions']
  },
  high: {
    range: [0.75, 0.89],
    description: 'Strong contextual clues',
    examples: ['Multiple relevant keywords', 'Clear intent patterns', 'Time-sensitive language']
  },
  medium: {
    range: [0.5, 0.74],
    description: 'Moderate confidence based on context',
    examples: ['Some relevant keywords', 'Partial pattern matches', 'Contextual inference']
  },
  low: {
    range: [0.3, 0.49],
    description: 'Weak signals, uncertain classification',
    examples: ['Ambiguous intent', 'Minimal context', 'Generic language']
  },
  very_low: {
    range: [0.1, 0.29],
    description: 'Very uncertain, fallback scenario',
    examples: ['No clear indicators', 'Contradictory signals', 'Insufficient information']
  }
};

/**
 * Helper function to build contextual prompts
 */
export function buildContextualPrompt(
  query: string,
  locale: string,
  conversationHistory?: string[],
  additionalContext?: Record<string, any>
): string {
  const template = USER_PROMPT_TEMPLATES[locale as keyof typeof USER_PROMPT_TEMPLATES] || USER_PROMPT_TEMPLATES.en;
  
  const currentDateTime = new Date().toISOString();
  const historySection = conversationHistory?.length 
    ? `**Recent Conversation:**\n${conversationHistory.slice(-3).map((msg, i) => `${i + 1}. ${msg}`).join('\n')}\n`
    : '';
  
  const contextSection = additionalContext 
    ? `**Additional Context:**\n${JSON.stringify(additionalContext, null, 2)}\n`
    : '';
  
  const sessionContext = additionalContext?.sessionInfo 
    ? `Session ID: ${additionalContext.sessionInfo.sessionId}, User: ${additionalContext.sessionInfo.userId}`
    : 'No session context';

  return template
    .replace('{query}', query)
    .replace('{conversationHistory}', historySection)
    .replace('{additionalContext}', contextSection)
    .replace('{currentDateTime}', currentDateTime)
    .replace('{locale}', locale)
    .replace('{sessionContext}', sessionContext);
}

/**
 * Helper function to get agent-specific guidance
 */
export function getAgentGuidance(agentType: AgentType) {
  return AGENT_SPECIFIC_GUIDANCE[agentType] || {
    keywords: [],
    patterns: [],
    examples: []
  };
}

/**
 * Helper function to validate confidence score
 */
export function validateConfidenceScore(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1 && !isNaN(confidence);
}

/**
 * Agent exclusion patterns for detecting when users want to avoid specific agents
 */
export const AGENT_EXCLUSION_PATTERNS = {
  [AgentType.WEB_SEARCH]: {
    avoidancePatterns: [
      'don\'t search the web',
      'without searching',
      'no web search',
      'avoid search',
      'don\'t look online',
      'offline only',
      'without internet',
      'no online search',
      'don\'t browse',
      'without browsing',
      'no external search',
      'local only',
      'don\'t fetch online',
      'avoid web lookup'
    ],
    negativePatterns: [
      /don't\s+(search|look|browse|fetch|find)\s+(the\s+)?(web|online|internet)/i,
      /without\s+(searching|browsing|looking)\s+(the\s+)?(web|online|internet)/i,
      /no\s+(web\s+)?(search|browsing|online\s+search)/i,
      /avoid\s+(web\s+)?(search|browsing)/i,
      /not?\s+(search|look|browse)\s+(online|web)/i
    ],
    exclusionKeywords: [
      'offline', 'local only', 'no internet', 'internal only', 'cached only'
    ]
  },
  [AgentType.CODE_INTERPRETER]: {
    avoidancePatterns: [
      'don\'t run code',
      'no code execution',
      'without running',
      'avoid execution',
      'don\'t execute',
      'no script',
      'text only',
      'explanation only',
      'theory only',
      'conceptual only',
      'without coding',
      'no programming',
      'don\'t compile',
      'static only'
    ],
    negativePatterns: [
      /don't\s+(run|execute|compile)\s+(code|script|program)/i,
      /no\s+(code\s+)?(execution|running|compilation)/i,
      /without\s+(running|executing|coding)/i,
      /avoid\s+(code\s+)?(execution|running)/i,
      /(explanation|theory|concept)\s+only/i,
      /text\s+only/i
    ],
    exclusionKeywords: [
      'theory only', 'explanation only', 'conceptual', 'static analysis', 'no execution'
    ]
  },
  [AgentType.URL_PULL]: {
    avoidancePatterns: [
      'don\'t access urls',
      'no url fetching',
      'without pulling',
      'avoid external links',
      'don\'t fetch',
      'no website access',
      'offline content',
      'local content only',
      'don\'t visit',
      'no external access',
      'without accessing',
      'don\'t pull from'
    ],
    negativePatterns: [
      /don't\s+(access|fetch|pull|visit)\s+(url|link|website|site)/i,
      /no\s+(url|link|website)\s+(access|fetching|pulling)/i,
      /without\s+(accessing|pulling|fetching)\s+(url|link|website)/i,
      /avoid\s+(external\s+)?(link|url|website)/i,
      /local\s+(content\s+)?only/i
    ],
    exclusionKeywords: [
      'local only', 'offline content', 'no external', 'internal only'
    ]
  },
  [AgentType.LOCAL_KNOWLEDGE]: {
    avoidancePatterns: [
      'don\'t use internal',
      'no local knowledge',
      'external only',
      'fresh information',
      'current data only',
      'no cached',
      'live data only',
      'real-time only'
    ],
    negativePatterns: [
      /don't\s+use\s+(internal|local|cached)/i,
      /no\s+(local|internal|cached)\s+(knowledge|data|info)/i,
      /(fresh|current|live|real-time)\s+(data|info|information)\s+only/i,
      /external\s+(sources\s+)?only/i
    ],
    exclusionKeywords: [
      'external only', 'fresh only', 'current only', 'live data', 'real-time'
    ]
  },
  [AgentType.STANDARD_CHAT]: {
    avoidancePatterns: [
      // 'use special tools',
      // 'enhanced features',
      // 'agent assistance',
      // 'advanced capabilities'
    ],
    negativePatterns: [
      // /use\s+(special\s+)?(tools|agents|features)/i,
      // /enhanced\s+(features|capabilities)/i,
      // /advanced\s+(help|assistance)/i
    ],
    exclusionKeywords: [
      // 'enhanced', 'advanced tools', 'special features'
    ]
  }
} as const;