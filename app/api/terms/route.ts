import { NextResponse } from 'next/server';
import crypto from 'crypto';

// English terms
const termsTextEn: string = `# *ai.msf.org* Terms of Use

The MSF AI Assistant is an internal AI chatbot developed for MSF staff. It uses Microsoft Azure\\'s Open AI large language models while keeping all data within MSF, ensuring privacy and control.

The AI Assistant can help you with everyday tasks such as writing text, summarizing documents, translating languages, and drafting emails or reports. It can also help with data analysis, brainstorming ideas, and finding quick answers to questions, making it a useful tool for daily work activities.

By using ai.msf.org, you agree with the following terms and conditions:

## Responsible use:

You agree you will use ai.msf.org responsibly. You will:

-   Use it in accordance with your MSF entities' applicable ICT, AI and other policies.

-   Always check outputs for accuracy, inclusivity and bias. Ai.msf.org uses experimental technology -- it gives no guarantee the outputs will be accurate. In addition, the technology has not been trained using data representative of MSF patients and communities. AI outputs can perpetuate bias, discrimination and stereotypes. You are responsible for checking the outputs produced.

-   Check outputs don't infringe third party intellectual property rights -- especially for anything used publicly. Like other generative AI systems, the technology behind ai.msf.org has been trained on third party intellectual property without clear permissions and licenses.

-   Be transparent about your AI use. Tell people if something you use has been produced by AI, and mark outputs as AI-generated.

**You will NOT use ai.msf.org for any of the following purposes:**

-   **Health care** *(to provide healthcare or answer health-related questions)*

-   **Surveillance or monitoring of MSF patients or communities or any other individual(s)**

-   **Employment-related decisions** *(to assist or replace employment-related decisions)*

-   **Automated decision-making** *(to make decisions that could be detrimental to an individual or community)*

-   **Creating media content for external communications on matters of public interest**

-   **Illegal or harmful activities**

## Privacy:

Using ai.msf.org is a safer and more secure environment than using other external free AI tools, which offer very little privacy guarantees. However, be aware there are still limits and caveats -- look at the usage policy for further details.

Like other Microsoft products, your login information will be processed by MSF as outlined in your MSF entity's privacy policy.

**You will NOT put into ai.msf.org prompts/ upload into it any the following information:**

-   **Personal data** (names, phone numbers, CVs, testimonies; anything which can directly or indirectly identify an individual -- this includes a combination of data that together can make it possible to identify an individual)

-   **Highly sensitive data** (data that can be intentionally or unintentionally used to harm individuals, communities, MSF or its staff -- determining the sensitivity of data requires incorporating context analysis e.g. locations of sensitive projects or at-risk groups, security incidents, and other operational details)

## Breaches / feedback

If you have any concerns, want to notify an incident, please contact: [ai.team@amsterdam.msf.org](mailto:ai.team@amsterdam.msf.org)

These terms can be modifying at any time by MSF -- we'll provide notice to you if we change them -- your continued use of ai.msf.org constitutes acceptance of any changes.`;

// French terms
const termsTextFr: string = `# CONDITIONS D'UTILISATION

En utilisant ai.msf.org, vous acceptez les conditions générales suivantes :

**Vous n'utiliserez PAS ai.msf.org (MSF AI Assistant) aux fins suivantes :**

• **Soins de santé** (pour fournir des soins de santé ou répondre à des questions liées à la santé)

• **Surveillance ou suivi des patients ou des communautés MSF ou de toute autre personne**

• **Décisions liées à l'emploi** (pour aider ou remplacer les décisions liées à l'emploi)

• **Prise de décision automatisée** (pour prendre des décisions qui pourraient être préjudiciables à une personne ou à une communauté)

• **Création de contenus médiatiques pour la communication externe sur des questions d'intérêt général**

• **Activités illégales ou nuisibles**

**Vous ne mettrez PAS dans ai.msf.org (MSF AI Assistant) des invites/téléchargerez les informations suivantes :**

• **Données personnelles** (noms, numéros de téléphone, CV, témoignages, tout ce qui permet d'identifier directement ou indirectement une personne, y compris une combinaison de données qui, ensemble, peuvent permettre d'identifier une personne)

• **Données hautement sensibles** (données qui peuvent être utilisées intentionnellement ou non pour nuire à des individus, des communautés, à MSF ou à son personnel – déterminer la sensibilité des Mise à jour 20.05.25 données nécessite d'intégrer une analyse contextuelle, par exemple l'emplacement de projets sensibles ou de groupes à risque, des incidents de sécurité et d'autres détails opérationnels)

## Utilisation responsable

Vous acceptez d’utiliser ai.msf.org de manière responsable. Vous:

• Utilisez le MSF AI Assistant conformément aux politiques applicables de vos entités MSF en matière de ICT (Information and Communication Technology), d'IA et autres. 

• Vérifiez toujours l'exactitude, l'inclusivité et le biais des réponses. ai.msf.org utilise une technologie expérimentale – elle ne garantit pas que les résultats seront exacts. De plus, la technologie n'a pas été entraînée à l'aide de données représentatives des patients et des communautés de MSF. Les résultats de l'IA peuvent perpétuer les préjugés, la discrimination et les stéréotypes. Vous êtes responsable de la vérification des réponses produites.

• Vérifiez que les réponses n'enfreignent pas les droits de propriété intellectuelle de tiers, en particulier pour tout ce qui est utilisé publiquement. Comme d'autres systèmes d'IA générative, la technologie sous-jacente à ai.msf.org a été entraînée sur la propriété intellectuelle de tiers sans autorisations ni licences claires. 

• Soyez transparent sur votre utilisation de l'IA. Dites aux gens si quelque chose que vous utilisez a été produit par l'IA et marquez les réponses comme générées par l'IA.

## Vie privée

L'utilisation de ai.msf.org est un environnement plus sûr et plus sécurisé que l'utilisation d'autres outils d'IA externes gratuits, qui offrent très peu de garanties de confidentialité. Cependant, sachez qu'il y a toujours des limites et des mises en garde - consultez la politique d'utilisation pour plus de détails. 

À l'instar des autres produits Microsoft, vos informations de connexion seront traitées par MSF comme indiqué dans la politique de confidentialité de votre entité MSF. 

## Infractions/commentaires

Si vous avez des préoccupations ou si vous souhaitez signaler un incident, veuillez contacter votre responsable de la sécurité informatique, votre DPO ou votre responsible ICT (Information and Communication Technology) local. Pour OCA, vous pouvez [signaler une violation de données ou de sécurité via Elixir](https://msfintl.sharepoint.com/sites/oca-dept-control-gdpr/SitePages/Report-data-breach-incident.aspx?web=1).

Ces conditions peuvent être modifiées à tout moment par MSF – nous vous en informerons si nous les modifions – votre utilisation continue de ai.msf.org constitue une acceptation de toute modification.
`;

const calculateHash = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

interface LocalizedContent {
  [locale: string]: {
    content: string;
    hash: string;
  };
}

interface TermsItem {
  localized: LocalizedContent;
  version: string;
  required: boolean;
}

interface TermsData {
  platformTerms: TermsItem;
}

const termsData: TermsData = {
  platformTerms: {
    localized: {
      en: {
        content: termsTextEn,
        hash: calculateHash(termsTextEn)
      },
      fr: {
        content: termsTextFr,
        hash: calculateHash(termsTextFr)
      }
    },
    version: '1.0.1',
    required: true
  }
};

export async function GET() {
  try {
    return NextResponse.json(termsData);
  } catch (error) {
    console.error('Error fetching terms:', error);
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
  }
}
