
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// English terms
const termsTextEn: string = `# ai.msf.org Terms of Use
By using ai.msf.org, you agree with the following terms and conditions:
**You will NOT use ai.msf.org for any of the following purposes:**
-   **Health care** *(to provide healthcare or answer health-related questions)*
-   **Surveillance or monitoring of MSF patients or communities or any other individual(s)**
-   **Employment-related decisions** *(to assist or replace employment-related decisions)*
-   **Automated decision-making** *(to make decisions that could be detrimental to an individual or community)*
-   **Creating media content for external communications on matters of public interest**
-   **Illegal or harmful activities**
**You will NOT put into ai.msf.org prompts/ upload into it any the following information:**
-   **Personal data** (names, phone numbers, CVs, testimonies; anything which can directly or indirectly identify an individual -- this includes a combination of data that together can make it possible to identify an individual)
-   **Highly sensitive data** (data that can be intentionally or unintentionally used to harm individuals, communities, MSF or its staff -- determining the sensitivity of data requires incorporating context analysis e.g. locations of sensitive projects or at-risk groups, security incidents, and other operational details)
# Responsible use
You agree you will use ai.msf.org responsibly. You will:
-   Use it in accordance with your MSF entities' applicable ICT, AI and other policies.
-   Always check outputs for accuracy, inclusivity and bias. Ai.msf.org uses experimental technology -- it gives no guarantee the outputs will be accurate. In addition, the technology has not been trained using data representative of MSF patients and communities. AI outputs can perpetuate bias, discrimination and stereotypes. You are responsible for checking the outputs produced.
-   Always be very careful about what you put into the prompt. Entering links that contain malware can have serious security repercussions.
-   Check outputs don't infringe third party intellectual property rights -- especially for anything used publicly. Like other generative AI systems, the technology behind ai.msf.org has been trained on third party intellectual property without clear permissions and licenses.
-   Consider the environment. Generative AI technologies use a lot of energy.
-   Not allow anyone else access to your account.
-   Be transparent about your AI use. Tell people if something you use has been produced by AI, and mark outputs as AI-generated.
# Privacy
Using ai.msf.org is a safer and more secure environment than using other external free AI tools, which offer very little privacy guarantees. However, be aware there are still limits and caveats -- look at the usage policy for further details.
Like other Microsoft products, your login information will be processed by MSF as outlined in your MSF entity's privacy policy.
# Breaches / feedback
If you have any concerns, want to notify an incident, please contact: [aiteam@amsterdam.msf.org](mailto:aiteam@amsterdam.msf.org)
These terms can be modifying at any time by MSF -- we'll provide notice to you if we change them -- your continued use of ai.msf.org constitutes acceptance of any changes.`;

// French terms
const termsTextFr: string = `# Conditions d'utilisation de ai.msf.org
En utilisant ai.msf.org, vous acceptez les conditions suivantes :
**Vous N'utiliserez PAS ai.msf.org pour l'une des fins suivantes :**
-   **Soins de santé** *(pour fournir des soins de santé ou répondre à des questions liées à la santé)*
-   **Surveillance ou suivi des patients ou des communautés de MSF ou de tout autre individu**
-   **Décisions liées à l'emploi** *(pour aider ou remplacer des décisions liées à l'emploi)*
-   **Prise de décision automatisée** *(pour prendre des décisions qui pourraient être préjudiciables à un individu ou à une communauté)*
-   **Création de contenu médiatique pour des communications externes sur des questions d'intérêt public**
-   **Activités illégales ou nuisibles**
**Vous NE mettrez PAS dans ai.msf.org des invites/n'y téléchargerez PAS les informations suivantes :**
-   **Données personnelles** (noms, numéros de téléphone, CV, témoignages ; tout ce qui peut directement ou indirectement identifier un individu -- cela inclut une combinaison de données qui, ensemble, peuvent permettre d'identifier un individu)
-   **Données hautement sensibles** (données qui peuvent être utilisées intentionnellement ou non pour nuire à des individus, des communautés, MSF ou son personnel -- déterminer la sensibilité des données nécessite d'intégrer une analyse contextuelle, par exemple, les emplacements de projets sensibles ou de groupes à risque, les incidents de sécurité et autres détails opérationnels)
# Utilisation responsable
Vous acceptez d'utiliser ai.msf.org de manière responsable. Vous vous engagez à :
-   L'utiliser conformément aux politiques TIC, IA et autres politiques applicables de votre entité MSF.
-   Toujours vérifier l'exactitude, l'inclusivité et les biais des résultats. Ai.msf.org utilise une technologie expérimentale -- il ne garantit pas l'exactitude des résultats. De plus, la technologie n'a pas été formée à l'aide de données représentatives des patients et des communautés de MSF. Les résultats de l'IA peuvent perpétuer des biais, des discriminations et des stéréotypes. Vous êtes responsable de la vérification des résultats produits.
-   Toujours être très prudent quant à ce que vous mettez dans l'invite. Entrer des liens contenant des logiciels malveillants peut avoir de graves répercussions sur la sécurité.
-   Vérifier que les résultats n'enfreignent pas les droits de propriété intellectuelle de tiers -- en particulier pour tout ce qui est utilisé publiquement. Comme d'autres systèmes d'IA générative, la technologie derrière ai.msf.org a été formée sur la propriété intellectuelle de tiers sans autorisations et licences claires.
-   Prendre en compte l'environnement. Les technologies d'IA générative consomment beaucoup d'énergie.
-   Ne pas permettre à quelqu'un d'autre d'accéder à votre compte.
-   Être transparent sur votre utilisation de l'IA. Informez les gens si quelque chose que vous utilisez a été produit par l'IA, et marquez les résultats comme générés par l'IA.
# Confidentialité
L'utilisation de ai.msf.org est un environnement plus sûr et plus sécurisé que l'utilisation d'autres outils d'IA externes gratuits, qui offrent très peu de garanties de confidentialité. Cependant, sachez qu'il y a encore des limites et des mises en garde -- consultez la politique d'utilisation pour plus de détails.
Comme d'autres produits Microsoft, vos informations de connexion seront traitées par MSF comme indiqué dans la politique de confidentialité de votre entité MSF.
# Violations / retours
Si vous avez des préoccupations, souhaitez signaler un incident, veuillez contacter : [aiteam@amsterdam.msf.org](mailto:aiteam@amsterdam.msf.org)
Ces conditions peuvent être modifiées à tout moment par MSF -- nous vous informerons si nous les modifions -- votre utilisation continue de ai.msf.org constitue l'acceptation de toute modification.`;

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
    version: '1.0.0',
    required: true
  }
};

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(termsData);
  } catch (error) {
    console.error('Error fetching terms:', error);
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
  }
}
