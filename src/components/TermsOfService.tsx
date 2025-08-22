import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const TermsOfService: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Agreement to Terms</h2>
            <p className="mb-4">
              By accessing and using Pipeline ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Description of Service</h2>
            <p className="mb-4">
              Pipeline is a job application tracking service that helps users organize and manage their job search process. Our service includes:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Job application tracking and organization</li>
              <li>Email integration with Gmail for automatic job email detection</li>
              <li>AI-powered analysis of job-related communications</li>
              <li>Status updates and progress tracking</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">User Accounts and Responsibilities</h2>
            
            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Account Creation</h3>
            <p className="mb-4">To use our service, you must:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be at least 18 years old</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Acceptable Use</h3>
            <p className="mb-4">You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Transmit any harmful, threatening, abusive, or defamatory content</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use automated scripts or bots without permission</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Privacy and Data Use</h2>
            <p className="mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
            </p>
            
            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Gmail Integration</h3>
            <p className="mb-4">By enabling email sync, you grant us permission to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access your Gmail account to read job-related emails</li>
              <li>Analyze email content using AI services</li>
              <li>Store relevant job application data</li>
              <li>Update job statuses based on email analysis</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Intellectual Property</h2>
            <p className="mb-4">
              The Service and its original content, features, and functionality are and will remain the exclusive property of Pipeline and its licensors. The Service is protected by copyright, trademark, and other laws.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Service Availability</h2>
            <p className="mb-4">We strive to provide reliable service, but we do not guarantee:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Continuous, uninterrupted, or secure access</li>
              <li>Freedom from errors or defects</li>
              <li>Compatibility with all devices or software</li>
              <li>Backup or recovery of your data</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
            <p className="mb-4">
              To the fullest extent permitted by applicable law, Pipeline shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Disclaimer of Warranties</h2>
            <p className="mb-4">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Pipeline expressly disclaims all warranties of any kind, whether express, implied, or statutory.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Services</h2>
            <p className="mb-4">
              Our Service may contain links to third-party services or integrate with third-party APIs. These third-party services have their own terms and conditions and privacy policies.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Retention and Deletion</h2>
            <p className="mb-4">
              You may delete your account at any time. Upon deletion:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Your account and all associated data will be permanently removed</li>
              <li>We may retain some information as required by law</li>
              <li>Cached or backup copies may persist for a reasonable time</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Governing Law</h2>
            <p className="mb-4">
              These Terms shall be interpreted and governed by the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Email: support@pipeline-jobs.com</li>
              <li>Address: [Your Business Address]</li>
            </ul>

            <p className="mt-8 text-sm text-gray-600">
              By using Pipeline, you acknowledge that you have read and understood these Terms of Service and agree to be bound by them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};