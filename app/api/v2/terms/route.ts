import { NextRequest, NextResponse } from 'next/server';

// Mock data for terms and privacy policy
const termsData = {
  platformTerms: {
    content: `# Platform Terms of Service

## 1. Introduction
Welcome to our platform. By using our services, you agree to these terms.

## 2. User Accounts
You are responsible for maintaining the security of your account.

## 3. Acceptable Use
You agree not to use the platform for any illegal or unauthorized purpose.

## 4. Termination
We reserve the right to terminate your access to the platform for violations of these terms.

## 5. Changes to Terms
We may modify these terms at any time. Your continued use of the platform constitutes acceptance of the modified terms.`,
    version: '1.0.0',
    hash: 'abc123', // In a real implementation, this would be a hash of the content
    required: true
  },
  privacyPolicy: {
    content: `# Privacy Policy

## 1. Information We Collect
We collect information you provide directly to us, such as your name and email address.

## 2. How We Use Information
We use your information to provide, maintain, and improve our services.

## 3. Information Sharing
We do not share your personal information with third parties except as described in this policy.

## 4. Data Security
We take reasonable measures to protect your personal information.

## 5. Changes to This Policy
We may update this privacy policy from time to time. Your continued use of the platform constitutes acceptance of the modified policy.`,
    version: '1.0.0',
    hash: 'def456', // In a real implementation, this would be a hash of the content
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
