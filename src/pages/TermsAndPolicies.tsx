import React from 'react';
import MobileHeader from "@/components/MobileHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from '@/hooks/useAuth';

const TermsAndPolicies: React.FC = () => {
  const { user } = useAuth();
  const isPremium = user?.user_metadata?.isPremium || false;

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={() => {}} isPremium={isPremium} />
      <main className="px-4 py-6">
        <div className="container mx-auto p-4 max-w-2xl">
          <h1 className="text-3xl font-bold mb-4">Oveon Terms and Conditions</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: september 7,2025</p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">Introduction</h2>
          <p className="mb-4">
            These Terms and Conditions form a legally binding agreement regarding the access and use of Oveon. By downloading, installing, registering for, or otherwise using the Service, you agree to be bound by these Terms.
          </p>
          <p className="mb-4">
            Your continued use of the Service, including after any changes to these Terms, constitutes your consent to those changes.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">1. AI Disclaimer and Important Notice</h2>
          <p className="mb-4">
            Ovion is powered by artificial intelligence. The suggestions and diagnostics are machine-generated and may be incomplete or imprecise. Guidance is provided for informational and educational purposes only and is not a substitute for professional advice or certified repairs. Outcomes may differ based on device type, age, condition, and user actions.
          </p>
          <p className="mb-4">
            You are responsible for confirming the relevance, safety, and suitability of AI-generated advice. Always prioritize personal and device safety, and consult a professional for significant repairs. The Company is not liable for injury, loss, property damage, or other adverse outcomes resulting from service use.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">2. Service Overview and Scope</h2>
          <p className="mb-1">
            Description: Oveon helps users diagnose, troubleshoot, and understand common electronic or electrical device issues.
          </p>
          <p className="mb-1">
            Features: These may include device scanning, AI-based solutions, repair tutorials, peer community support forums, FAQs, help documentation, and Premium content.
          </p>
          <p className="mb-1">
            No Professional Relationship: Byte Fixer is not a licensed repair entity. Interaction with the Service does not form a customer-repairer or client-professional relationship.
          </p>
          <p className="mb-4">
            Availability: The Service, features, or content may change, be withdrawn, or be subject to limitations or restrictions at any time.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">3. User Eligibility and Account Responsibilities</h2>
          <p className="mb-1">
            Minimum Age: You must be 12 years or older, or the legal age of majority in your jurisdiction. Underage users require active oversight from a parent or legal guardian.
          </p>
          <p className="mb-1">
            Accurate Registration: You agree to provide valid, current, and complete information and update it as necessary.
          </p>
          <p className="mb-1">
            Account Security: You must safeguard login credentials. You are liable for any activity using your account, whether authorized by you or not.
          </p>
          <p className="mb-1">
            Multiple Accounts: No user may create or control more than one account without explicit Company permission.
          </p>
          <p className="mb-4">
            Termination: The Company reserves the right to suspend, restrict, or terminate accounts at its sole discretion, especially for abuse, breaches, or fraudulent activity.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">4. Compliance with Laws and Regulations</h2>
          <p className="mb-1">
            Oveon complies with applicable data protection, privacy, consumer, and cybersecurity laws (e.g., GDPR, CCPA, IT Act).
          </p>
          <p className="mb-1">
            International Users: If you access Oveon from outside INDIA, you are solely responsible for compliance with local laws in your jurisdiction.
          </p>
          <p className="mb-4">
            Cooperation: The Company may disclose user data as required by law or to assist law enforcement investigations.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">5. User Responsibilities and Risk Assumption</h2>
          <p className="mb-1">
            Device Compatibility: Not all devices and repairs are supported. Follow device-specific manuals and safety instructions.
          </p>
          <p className="mb-1">
            Precautions: Always disconnect devices from power, use proper equipment, and avoid hazardous environments.
          </p>
          <p className="mb-1">
            Data: Back up your data before attempting repairs. The Company is not responsible for data loss or corruption.
          </p>
          <p className="mb-4">
            Third-Party Parts/Tools: Use of third-party components or accessories is at your own risk.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">6. Acceptable Use and Prohibited Conduct</h2>
          <p className="mb-1">Users must not:</p>
          <ul className="list-disc list-inside mb-4 pl-4">
            <li>Violate any law or regulation.</li>
            <li>Circumvent, disable, or hack Premium features or security mechanisms.</li>
            <li>Share unauthorized or altered copies of the Service.</li>
            <li>Spread malware or malicious code.</li>
            <li>Harass, threaten, or defame other users, the Company, or third parties.</li>
            <li>Submit false or misleading information.</li>
            <li>Reverse engineer, decompile, or otherwise attempt to access source code.</li>
            <li>Scrape, extract, or systematically copy Service content or databases.</li>
            <li>Use automated scripts or bots without explicit consent.</li>
            <li>Intentionally overload, disrupt, or harm the Service or servers.</li>
          </ul>
          <p className="mb-4">
            Violations may result in immediate account suspension or permanent ban.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">7. Purchases, Subscriptions, and Payment</h2>
          <p className="mb-1">
            Premium Features: Access to certain features may require payment or a subscription.
          </p>
          <p className="mb-1">
            Billing: Fees are charged as indicated during subscription or purchase. All prices are exclusive of applicable taxes unless otherwise stated.
          </p>
          <p className="mb-1">
            Renewals: Subscriptions renew automatically unless canceled before the renewal period.
          </p>
          <p className="mb-1">
            Refunds: Except where required by law, all purchases are final and non-refundable.
          </p>
          <p className="mb-4">
            Payment Methods: You must provide valid, authorized payment information. Using stolen or unauthorized payment methods is prohibited.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">8. Disclaimers, Warranties, and Limitation of Liability</h2>
          <p className="mb-1">
            As Is Basis: The Service is provided “as is” and “as available,” with all faults.
          </p>
          <p className="mb-1">
            No Warranty: The Company makes no representations regarding completeness, accuracy, reliability, or availability. No oral or written information shall create any warranty.
          </p>
          <p className="mb-1">
            Service Interruptions: We do not guarantee uninterrupted access and may conduct maintenance or updates at any time.
          </p>
          <p className="mb-1">
            Limitation: In no event will our liability exceed the amount you paid for services in the previous twelve months, or the minimum permitted by law.
          </p>
          <p className="mb-4">
            No Consequential Damages: Under no circumstances are we liable for indirect, punitive, incidental, special, or consequential damages (including lost profits, data, or opportunities).
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">9. Intellectual Property and User Content</h2>
          <p className="mb-1">
            Ownership: All Service content (e.g., software, images, text, graphics, design) is owned or licensed by us, protected by applicable intellectual property laws.
          </p>
          <p className="mb-1">
            Restrictions: Reproduction, redistribution, or commercial exploitation is prohibited without our prior written consent.
          </p>
          <p className="mb-1">
            User Submissions: By posting or submitting content (e.g., in forums or support tickets), you grant us a worldwide, royalty-free, irrevocable, non-exclusive license to use, copy, modify, publish, distribute, and display such content.
          </p>
          <p className="mb-4">
            DMCA and Copyright Infringement: Report suspected copyright infringement to aswinai0000@gmail.com. We reserve the right to remove material and suspend repeat infringers.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">10. Third-Party Services, Links, and Integrations</h2>
          <p className="mb-1">
            The Service may contain links to third-party websites, software, or advertisements.
          </p>
          <p className="mb-1">
            The Company does not vet, endorse, or assume responsibility for third-party content or services, and you use them solely at your own risk.
          </p>
          <p className="mb-4">
            Transactions with third parties are between you and those parties.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">11. Privacy & Data Protection</h2>
          <p className="mb-1">
            How We Use Your Data: We collect, use, and store your information according to our Privacy Policy.
          </p>
          <p className="mb-1">
            User Rights: Subject to applicable laws, you may access or request deletion of your information.
          </p>
          <p className="mb-4">
            Security: We employ industry-standard measures for data protection but cannot guarantee absolute security.
          </p>
          <p className="mb-4">
            Please read the Privacy Policy for full details.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">12. Support and Updates</h2>
          <p className="mb-1">
            Support: We offer technical and customer support via aswinai0000@gmail.com.
          </p>
          <p className="mb-1">
            Modifications: We may modify or discontinue features or the entire Service at our discretion, with or without notice.
          </p>
          <p className="mb-4">
            Downtime: We will attempt to schedule maintenance during off-peak hours, but availability may be affected without prior notice.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">13. Feedback, Suggestions, and User Ideas</h2>
          <p className="mb-4">
            By submitting ideas, suggestions, or improvements to the Company, you give us unrestricted rights to use and exploit such feedback for any purpose, commercial or otherwise, without compensation or attribution.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">14. Beta Features and Previews</h2>
          <p className="mb-4">
            We may release beta, experimental, or preview features from time to time. These may be unstable or incomplete, and your continued access or data may not be guaranteed. Use of such features is at your own risk.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">15. Export Controls and Sanctions</h2>
          <p className="mb-4">
            You agree not to use, export, or re-export Oveon in violation of applicable export laws or regulations, including those of the United States, the European Union, or your own jurisdiction. You represent you are not subject to any government sanctions or controls that prohibit use of this software.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">16. Indemnification</h2>
          <p className="mb-4">
            You agree to indemnify, defend, and hold harmless the Company and its officers, directors, employees, agents, licensors, and partners from and against any claims, damages, losses, or expenses (including attorney’s fees) arising from:
          </p>
          <ul className="list-disc list-inside mb-4 pl-4">
            <li>Your breach of these Terms;</li>
            <li>Your misuse or unauthorized use of the Service;</li>
            <li>Your violation of any law, regulation, or third-party right.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-3">17. Termination and Account Closure</h2>
          <p className="mb-4">
            We reserve the right to suspend or permanently terminate your access (with or without notice) for:
          </p>
          <ul className="list-disc list-inside mb-4 pl-4">
            <li>Material breach of these Terms;</li>
            <li>Repeated or egregious violations (e.g., hacking, fraud, harassment);</li>
            <li>Legal or regulatory reasons.</li>
          </ul>
          <p className="mb-4">
            Neither you nor any third party shall have claims for compensation or damages arising from the termination.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">18. Governing Law and Dispute Resolution</h2>
          <p className="mb-1">
            These Terms are governed by and construed under the laws of Andhra pradesh,INDIA without reference to conflict-of-laws principles.
          </p>
          <p className="mb-1">
            Any disputes shall be resolved solely in the courts located in Andhra pradesh, INDIA.
          </p>
          <p className="mb-4">
            You waive any right to trial by jury or participation in class actions.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">19. Severability</h2>
          <p className="mb-4">
            If any term or clause of these Terms is held invalid or unenforceable, the remainder will remain in force.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">20. Waiver</h2>
          <p className="mb-4">
            Our failure to enforce any right or provision in these Terms does not constitute a waiver of such right or provision.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">21. Entire Agreement</h2>
          <p className="mb-4">
            These Terms, along with the Privacy Policy, are the complete agreement between you and the Company regarding the Service and supersede all prior understandings.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">22. Assignment</h2>
          <p className="mb-4">
            You may not assign or transfer your rights under these Terms. The Company may freely assign or delegate its rights and obligations.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">23. Contact Information and Notices</h2>
          <p className="mb-1">
            For support or questions regarding these Terms, contact us at:
          </p>
          <p className="mb-1">
            Email: aswinai0000@gmail.com
          </p>
          <p className="mb-4">
            Address: Andhra pradesh,INDIA
          </p>
          <p className="mb-4">
            Notices shall be effective upon delivery to the address provided.
          </p>

          <p className="text-sm text-gray-500 mb-8">End of Terms and Conditions</p>

          <footer className="text-center mt-8 pt-4 border-t border-gray-200">
            <p>Contact: aswinai0000@gmail.com</p>
            <p>Address: Andhra pradesh, INDIA</p>
          </footer>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default TermsAndPolicies;
