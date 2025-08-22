import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to App
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Introduction</h2>
            <p className="mb-4">
              Welcome to Pipeline ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our job application tracking service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Personal Information</h3>
            <p className="mb-4">We may collect personal information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Email address and name (through Google OAuth)</li>
              <li>Job application details you choose to track</li>
              <li>Communication preferences</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Email Data</h3>
            <p className="mb-4">
              When you enable email sync, we access your Gmail account to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Read job-related emails to automatically track applications</li>
              <li>Analyze email content to update job statuses</li>
              <li>Link emails to corresponding job applications</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Usage Data</h3>
            <p className="mb-4">We automatically collect certain information about your use of our service:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Device information and browser type</li>
              <li>Usage patterns and feature interactions</li>
              <li>Error logs and performance data</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide and maintain our job tracking service</li>
              <li>Automatically detect and organize job-related emails</li>
              <li>Improve our AI-powered job application analysis</li>
              <li>Communicate with you about service updates</li>
              <li>Ensure security and prevent fraud</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Sharing and Disclosure</h2>
            <p className="mb-4">We do not sell, trade, or rent your personal information. We may share information only in these circumstances:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and users' safety</li>
              <li>With service providers who assist in our operations (under strict confidentiality agreements)</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
            <p className="mb-4">
              We retain your personal information only as long as necessary to provide our services and fulfill the purposes outlined in this policy. You may request deletion of your account and data at any time.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Your Rights</h2>
            <p className="mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access to your personal information</li>
              <li>Correction of inaccurate data</li>
              <li>Deletion of your information</li>
              <li>Data portability</li>
              <li>Withdrawal of consent</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Services</h2>
            <p className="mb-4">Our service integrates with:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Google Gmail API (for email access)</li>
              <li>Supabase (for data storage)</li>
              <li>AWS Bedrock (for AI analysis)</li>
              <li>Vercel (for hosting and analytics)</li>
            </ul>
            <p className="mb-4">
              These services have their own privacy policies that govern their use of your information.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Children's Privacy</h2>
            <p className="mb-4">
              Our service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Email: privacy@pipeline-jobs.com</li>
              <li>Address: [Your Business Address]</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};