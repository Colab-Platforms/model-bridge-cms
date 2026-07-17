import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";

export default function RefundsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Refund Policy"
      intro="Our refund policy for Colab One, marketed under the name Colab One, is structured around our pay-as-you-go digital credit system."
      effectiveDate="17 July 2026"
      sections={[
        {
          heading: "Overview",
          body: (
            <p>
              Because Colab One operates on a pay-as-you-go digital credit system, refunds
              are assessed with reference to the portion of purchased digital credits that remains
              unused at the time a refund request is submitted, rather than as a blanket right to a
              refund of any purchase. This policy is intended to be read together with our{" "}
              <Link href="/terms" className="text-indigo-600 font-semibold hover:underline">
                Terms of Service
              </Link>{" "}
              and applies to all purchases of digital credits made through the Service.
            </p>
          ),
        },
        {
          heading: "Eligibility for Refunds",
          body: (
            <p>
              We offer a thirty (30) day money-back guarantee on unused credit purchases. If you
              have topped up your wallet with digital credits but have not yet consumed those
              credits through API requests processed by the Service (including, without
              limitation, token generation, embeddings, or image generation), you are eligible to
              request a full refund of the unused portion within thirty (30) days of the original
              transaction date. Requests submitted after this thirty (30) day window will be
              considered at our discretion and are not guaranteed.
            </p>
          ),
        },
        {
          heading: "Non-Refundable Scenarios",
          body: (
            <p>
              Owing to the nature of API consumption and the costs we incur with upstream AI
              providers in real time, we are unable to offer refunds for digital credits that have
              already been consumed or used to generate output through the Service. Once digital
              credits have been debited from your wallet in connection with a processed API
              request, that transaction is final and non-reversible, irrespective of whether the
              resulting output met your expectations.
            </p>
          ),
        },
        {
          heading: "How to Request a Refund",
          body: (
            <>
              <p>
                As Paddle.com is the Merchant of Record for all orders placed through the Service,
                Paddle manages all payment processing and the issuance of refunds. To request a
                refund for unused digital credits, please contact our support team at{" "}
                <a href="mailto:support@colabone.com" className="text-indigo-600 font-semibold hover:underline">
                  support@colabone.com
                </a>{" "}
                with your account details and the transaction you wish to have refunded.
              </p>
              <p>
                Upon receiving your request, we will verify your current unused credit balance
                against the relevant purchase and, where the request is eligible under this policy,
                submit the refund authorization directly to Paddle. Paddle will then process the
                approved refund back to your original payment method in accordance with its own
                processing timelines.
              </p>
            </>
          ),
        },
        {
          heading: "Processing Time",
          body: (
            <p>
              Once a refund has been authorized and submitted to Paddle, funds are typically
              returned to your original payment method within five (5) to ten (10) business days,
              though the exact timing may vary depending on your card issuer, bank, or payment
              provider and is outside our direct control.
            </p>
          ),
        },
        {
          heading: "Contact Us",
          body: (
            <p>
              If you have any questions about this Refund Policy or the status of a refund request,
              please contact us at{" "}
              <a href="mailto:support@colabone.com" className="text-indigo-600 font-semibold hover:underline">
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
