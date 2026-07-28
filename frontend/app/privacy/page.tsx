import LegalLayout from "@/components/legal/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Colab Intelligence Pvt Ltd is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use Colab One, marketed under the name Colab One."
      effectiveDate="17 July 2026"
      sections={[
        {
          heading: "Information We Collect",
          body: (
            <p>
              To provide our unified LLM gateway, we collect standard account information, such as
              your name, email address, and organizational details, that you provide when
              registering for or using the Service. We also collect technical data necessary to
              operate the Service and to display your usage analytics, including API request logs,
              token consumption, latency measurements, model selection, and IP addresses associated
              with requests made through your API keys. This information is used to authenticate
              your requests, accurately meter and deduct credits from your digital wallet, and
              populate the usage and billing dashboards available to you.
            </p>
          ),
        },
        {
          heading: "Payment Processing and Financial Data",
          body: (
            <p>
              We do not collect, process, or store your credit card details or other sensitive
              financial data on our servers. All checkout processes and payment transactions
              conducted through the Service are securely handled by our Merchant of Record,
              Paddle.com. Paddle processes and stores your payment information in accordance with
              its own strict security standards, including applicable card industry (PCI-DSS)
              requirements, and its own Privacy Policy, which governs the handling of your payment
              data independently of this policy.
            </p>
          ),
        },
        {
          heading: "How We Use Your Data",
          body: (
            <p>
              We use the data we collect strictly to operate and maintain the API gateway,
              authenticate and route your requests to the appropriate upstream AI providers,
              accurately deduct digital credits based on your token usage, detect and prevent
              fraud or abuse of the Service, and provide you with detailed analytics and reporting
              inside your dashboard. We do not sell your personal data, your API request content,
              or the prompts and outputs generated through your use of the Service to third
              parties.
            </p>
          ),
        },
        {
          heading: "Sharing With Upstream Providers",
          body: (
            <p>
              In order to fulfil your API requests, the content of those requests is transmitted to
              the relevant upstream AI provider you have selected or that has been selected by the
              Service&rsquo;s routing logic (for example, OpenAI, Anthropic, or Google). Each such
              provider processes that content subject to its own applicable terms and privacy
              policy. We encourage you to review the policies of the specific upstream providers
              accessible through the Service.
            </p>
          ),
        },
        {
          heading: "Data Retention",
          body: (
            <p>
              We retain account information and usage logs for as long as your account remains
              active and for a reasonable period thereafter as necessary to comply with our legal
              obligations, resolve disputes, enforce our agreements, and maintain accurate business
              records. Where data is no longer required for these purposes, we take reasonable
              steps to delete or anonymize it.
            </p>
          ),
        },
        {
          heading: "Your Rights",
          body: (
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, port, or
              request the deletion of the personal data we hold about you, as well as the right to
              object to or restrict certain processing activities. To exercise any of these rights,
              please contact us using the details below; we will respond to verified requests
              within the timeframes required by applicable law.
            </p>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              We implement reasonable technical and organizational measures designed to protect
              your personal data against unauthorized access, alteration, disclosure, or
              destruction. However, no method of transmission over the internet or method of
              electronic storage is completely secure, and we cannot guarantee absolute security.
            </p>
          ),
        },
        {
          heading: "Changes to This Policy",
          body: (
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our
              practices or for other operational, legal, or regulatory reasons. We will indicate
              the effective date of the most recent revision at the top of this page. Material
              changes will be communicated to you through the dashboard or by email where
              appropriate.
            </p>
          ),
        },
        {
          heading: "Contact Us",
          body: (
            <p>
              If you have any questions or concerns about this Privacy Policy or our data
              practices, or if you wish to exercise any of your data protection rights, please
              contact us at{" "}
              <a href="mailto:support@colabone.com" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                support@colabone.com
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
