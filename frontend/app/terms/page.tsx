import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      intro="These Terms of Service govern your access to and use of Colab One, marketed under the name Colab One."
      effectiveDate="17 July 2026"
      sections={[
        {
          heading: "Introduction",
          body: (
            <>
              <p>
                Welcome to Colab One, marketed under the brand name &ldquo;Colab One&rdquo;
                (the &ldquo;Service&rdquo;), a service provided by Colab Intelligence Pvt Ltd
                (&ldquo;Colab Intelligence,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                &ldquo;our&rdquo;). By creating an account, accessing, or otherwise using the
                Service, you agree to be bound by these Terms of Service (the &ldquo;Terms&rdquo;).
                If you do not agree to these Terms, you must not access or use the Service.
              </p>
              <p>
                The Service consists of a unified application programming interface (API) gateway
                to third-party large language model (&ldquo;LLM&rdquo;) providers, an account and
                usage management dashboard, and a digital credit (wallet) system used to fund your
                consumption of the Service. These Terms apply to all users of the Service,
                including individual developers, organizations, and any authorized users acting on
                their behalf.
              </p>
            </>
          ),
        },
        {
          heading: "Merchant of Record",
          body: (
            <>
              <p>
                Our order process is conducted by our online reseller, Paddle.com (&ldquo;Paddle&rdquo;).
                Paddle.com Market Limited is the Merchant of Record for all orders placed through the
                Service. This means that, for all purchases of digital credits or subscription
                plans made through the Service, your transaction is with Paddle rather than
                directly with Colab Intelligence Pvt Ltd, and Paddle is responsible for processing your
                payment and issuing the relevant invoice or receipt.
              </p>
              <p>
                Paddle provides all customer service inquiries relating to billing, invoicing, and
                payment processing, and handles returns and refunds in accordance with Paddle&rsquo;s
                own policies and applicable consumer protection law, as further described in our{" "}
                <Link href="/refunds" className="text-indigo-600 font-semibold hover:underline">
                  Refund Policy
                </Link>
                . Nothing in this section limits Colab Intelligence Pvt Ltd&rsquo;s responsibility for
                the operation, availability, and technical performance of the Service itself.
              </p>
            </>
          ),
        },
        {
          heading: "Accounts and Eligibility",
          body: (
            <p>
              To use the Service, you must register for an account and provide accurate, current,
              and complete information. You are responsible for maintaining the confidentiality of
              your account credentials and for all activity that occurs under your account. You
              must promptly notify us of any unauthorized use of your account or any other breach
              of security. You represent that you have the legal capacity to enter into a binding
              agreement and, where applicable, that you are authorized to bind the organization on
              whose behalf you are registering.
            </p>
          ),
        },
        {
          heading: "Use of the Service",
          body: (
            <>
              <p>
                Colab One provides access to various AI providers through a single, unified
                API key and request format. You are solely responsible for maintaining the security
                and confidentiality of your API keys and for all activity, including all token
                consumption and associated charges, that occurs through the use of your API keys,
                whether or not authorized by you.
              </p>
              <p>
                Your usage of the Service is funded through a digital wallet credit system operated
                on a pay-as-you-go basis. Digital credits are debited from your wallet in real time
                as your API requests are processed by the underlying LLM providers. It is your
                responsibility to monitor your wallet balance and usage; the Service may throttle,
                queue, or reject requests where your available credit balance is insufficient.
              </p>
            </>
          ),
        },
        {
          heading: "Acceptable Use",
          body: (
            <p>
              You agree not to use the Service for any unlawful purpose, to generate content that
              is defamatory, obscene, or otherwise harmful, or to circumvent, disable, or otherwise
              interfere with the safety, content, or usage policies of any upstream AI provider
              (including, without limitation, OpenAI, Anthropic, or Google). You further agree not
              to attempt to reverse engineer, resell, sublicense, or misuse the Service in a manner
              that could impair its integrity, security, or availability to other users. We reserve
              the right, at our sole discretion, to suspend or revoke API keys, and to suspend or
              terminate accounts, that we reasonably believe violate these Terms.
            </p>
          ),
        },
        {
          heading: "Intellectual Property",
          body: (
            <p>
              The Service, including its underlying software, design, and documentation, is owned
              by Colab Intelligence Pvt Ltd and its licensors and is protected by applicable
              intellectual property laws. Except for the limited right to access and use the
              Service in accordance with these Terms, no other rights are granted to you. Output
              generated through the Service via third-party LLM providers remains subject to the
              applicable terms of the relevant upstream provider.
            </p>
          ),
        },
        {
          heading: "Disclaimers and Limitation of Liability",
          body: (
            <p>
              The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
              basis, without warranties of any kind, whether express or implied, including
              warranties of merchantability, fitness for a particular purpose, or
              non-infringement. To the maximum extent permitted by applicable law, Colab
              Intelligence Ltd shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or for any loss of profits, data, or goodwill,
              arising out of or in connection with your use of the Service, including any
              interruption, error, or unavailability of any upstream AI provider.
            </p>
          ),
        },
        {
          heading: "Changes to These Terms",
          body: (
            <p>
              We may revise these Terms from time to time to reflect changes to the Service, our
              business practices, or applicable law. Where changes are material, we will provide
              reasonable notice, such as by posting an updated effective date on this page or
              notifying you through the dashboard or by email. Your continued use of the Service
              after such changes take effect constitutes your acceptance of the revised Terms.
            </p>
          ),
        },
        {
          heading: "Contact Information",
          body: (
            <p>
              If you have any questions regarding these Terms or the technical operation of Model
              Bridge CMS, please contact us at{" "}
              <a href="mailto:support@colabone.com" className="text-indigo-600 font-semibold hover:underline">
                support@colabone.com
              </a>
              . For billing or payment-related queries, including invoices and refunds, Paddle
              handles all customer service inquiries as the Merchant of Record for the Service.
            </p>
          ),
        },
      ]}
    />
  );
}
