import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const termsText: string = `# ai.msf.org Terms of Use

By using ai.msf.org, you agree with the following terms and conditions:

**You will NOT use ai.msf.org for any of the following purposes:**

-   **Health care** *(to provide healthcare or answer health-related
    questions)*

-   **Surveillance or monitoring of MSF patients or communities or any
    other individual(s)**

-   **Employment-related decisions** *(to assist or replace
    employment-related decisions)*

-   **Automated decision-making** *(to make decisions that could be
    detrimental to an individual or community)*

-   **Creating media content for external communications on matters of
    public interest**

-   **Illegal or harmful activities**

**You will NOT put into ai.msf.org prompts/ upload into it any the
following information:**

-   **Personal data** (names, phone numbers, CVs, testimonies; anything
    which can directly or indirectly identify an individual -- this
    includes a combination of data that together can make it possible to
    identify an individual)

-   **Highly sensitive data** (data that can be intentionally or
    unintentionally used to harm individuals, communities, MSF or its
    staff -- determining the sensitivity of data requires incorporating
    context analysis e.g. locations of sensitive projects or at-risk
    groups, security incidents, and other operational details)

# Responsible use

You agree you will use ai.msf.org responsibly. You will:

-   Use it in accordance with your MSF entities' applicable ICT, AI and
    other policies.

-   Always check outputs for accuracy, inclusivity and bias. Ai.msf.org
    uses experimental technology -- it gives no guarantee the outputs
    will be accurate. In addition, the technology has not been trained
    using data representative of MSF patients and communities. AI
    outputs can perpetuate bias, discrimination and stereotypes. You are
    responsible for checking the outputs produced.

-   Always be very careful about what you put into the prompt. Entering
    links that contain malware can have serious security repercussions.

-   Check outputs don't infringe third party intellectual property
    rights -- especially for anything used publicly. Like other
    generative AI systems, the technology behind ai.msf.org has been
    trained on third party intellectual property without clear
    permissions and licenses.

-   Consider the environment. Generative AI technologies use a lot of
    energy.

-   Not allow anyone else access to your account.

-   Be transparent about your AI use. Tell people if something you use
    has been produced by AI, and mark outputs as AI-generated.

# Privacy

Using ai.msf.org is a safer and more secure environment than using other
external free AI tools, which offer very little privacy guarantees.
However, be aware there are still limits and caveats -- look at the
usage policy for further details.

Like other Microsoft products, your login information will be processed
by MSF as outlined in your MSF entity's privacy policy.

# Breaches / feedback

If you have any concerns, want to notify an incident, please contact:
[aiteam@amsterdam.msf.org](mailto:aiteam@amsterdam.msf.org)

These terms can be modifying at any time by MSF -- we'll provide notice
to you if we change them -- your continued use of ai.msf.org constitutes
acceptance of any changes.`


const calculateHash = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

const termsData = {
  platformTerms: {
    content: termsText,
    version: '1.0.0',
    hash: calculateHash(termsText),
    required: true
  },
//   privacyPolicy: {
//     content: `# Privacy Policy
//
// ## 1. Information We Collect
// We collect information you provide directly to us, such as your name and email address.
//
// ## 2. How We Use Information
// We use your information to provide, maintain, and improve our services.
//
// ## 3. Information Sharing
// We do not share your personal information with third parties except as described in this policy.
//
// ## 4. Data Security
// We take reasonable measures to protect your personal information.
//
// ## 5. Changes to This Policy
// We may update this privacy policy from time to time. Your continued use of the platform constitutes acceptance of the modified policy.`,
//     version: '1.0.0',
//     hash: 'def456', // In a real implementation, this would be a hash of the content
//     required: true
//   }
};

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(termsData);
  } catch (error) {
    console.error('Error fetching terms:', error);
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
  }
}
