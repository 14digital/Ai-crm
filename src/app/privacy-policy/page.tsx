import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — The Helpers Oman",
  description:
    "Privacy Policy for The Helpers Oman. Learn how we collect, use, and protect your personal information when you contact us via WhatsApp or our website.",
};

export default function PrivacyPolicyPage() {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.logoMark}>TH</div>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.subtitle}>The Helpers Oman — Manpower Services</p>
          <p style={styles.effectiveDate}>
            <strong>Effective Date:</strong> 15 June 2026 &nbsp;|&nbsp;
            <strong>Last Updated:</strong> 15 June 2026
          </p>
        </header>

        {/* Body */}
        <main style={styles.body}>
          {/* 1. Introduction */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>1. Introduction</h2>
            <p style={styles.text}>
              Welcome to <strong>The Helpers Oman</strong> (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;). We are a professional
              manpower and home services company based in Oman, providing
              reliable household and support staff services across Muscat, Nizwa,
              and surrounding regions.
            </p>
            <p style={styles.text}>
              This Privacy Policy explains how we collect, use, store, and
              protect your personal information when you interact with us —
              including through WhatsApp messaging, our website at{" "}
              <a
                href="https://thehelpersoman.com"
                style={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                thehelpersoman.com
              </a>
              , or any other communication channel.
            </p>
            <p style={styles.text}>
              Our WhatsApp communications are powered by{" "}
              <strong>NexaDesk</strong>, a WhatsApp Business CRM platform
              operated by <strong>14Digital Limited</strong> (UK), which we use
              to manage customer conversations.
            </p>
          </section>

          {/* 2. Who We Are */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>2. Who We Are (Data Controller)</h2>
            <div style={styles.infoCard}>
              <p style={styles.text}>
                <strong>Business Name:</strong> The Helpers Oman
              </p>
              <p style={styles.text}>
                <strong>Business Type:</strong> Manpower &amp; Home Services
              </p>
              <p style={styles.text}>
                <strong>Location:</strong> Muscat &amp; Nizwa, Oman
              </p>
              <p style={styles.text}>
                <strong>Website:</strong>{" "}
                <a
                  href="https://thehelpersoman.com"
                  style={styles.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://thehelpersoman.com
                </a>
              </p>
              <p style={styles.text}>
                <strong>Contact Email:</strong>{" "}
                <a href="mailto:thehelopersoman@gmail.com" style={styles.link}>
                  thehelopersoman@gmail.com
                </a>
              </p>
              <p style={styles.text}>
                <strong>Phone (Muscat):</strong> 9281 1035 / 7676 0110 / 9981 1034
              </p>
              <p style={styles.text}>
                <strong>Phone (Nizwa):</strong> 7676 8110 / 7676 7110
              </p>
            </div>
          </section>

          {/* 3. Information We Collect */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>3. Information We Collect</h2>
            <p style={styles.text}>
              We may collect the following types of personal information:
            </p>

            <h3 style={styles.subsectionTitle}>
              3.1 Information You Provide Directly
            </h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Full name, phone number, and email address
              </li>
              <li style={styles.listItem}>
                WhatsApp profile name and phone number
              </li>
              <li style={styles.listItem}>
                Messages, enquiries, and attachments sent via WhatsApp or
                contact forms
              </li>
              <li style={styles.listItem}>
                Service requirements (type of household help needed, location,
                preferred schedule)
              </li>
              <li style={styles.listItem}>
                Appointment and booking details
              </li>
              <li style={styles.listItem}>
                Payment and billing information (where applicable)
              </li>
            </ul>

            <h3 style={styles.subsectionTitle}>
              3.2 Information Collected Automatically
            </h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Device type, browser type, and IP address
              </li>
              <li style={styles.listItem}>
                Website usage data (pages visited, time spent)
              </li>
              <li style={styles.listItem}>
                Cookies and similar tracking technologies
              </li>
            </ul>

            <h3 style={styles.subsectionTitle}>
              3.3 Information from Third Parties
            </h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>WhatsApp Business API (Meta Platforms, Inc.):</strong>{" "}
                Message content, delivery status, and WhatsApp profile data when
                you contact us via WhatsApp
              </li>
              <li style={styles.listItem}>
                <strong>NexaDesk (14Digital Limited):</strong> Our CRM
                platform which stores and manages our customer conversations
              </li>
              <li style={styles.listItem}>
                <strong>Google Gemini:</strong> Used to help write replies to
                enquiries
              </li>
            </ul>
          </section>

          {/* 4. How We Use Your Information */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              4. How We Use Your Information
            </h2>
            <p style={styles.text}>
              We use your personal information for the following purposes:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Responding to Enquiries:</strong> To reply to your
                messages and questions about our services via WhatsApp, phone,
                or email
              </li>
              <li style={styles.listItem}>
                <strong>Service Bookings:</strong> To process your service
                requests, appointments, and bookings
              </li>
              <li style={styles.listItem}>
                <strong>Customer Communication:</strong> To keep you informed
                about your booking status, service updates, and follow-ups
              </li>
              <li style={styles.listItem}>
                <strong>AI-Assisted Responses:</strong> To use AI technology to
                provide faster, more accurate responses to your enquiries
              </li>
              <li style={styles.listItem}>
                <strong>Service Improvement:</strong> To understand customer
                needs and improve our services
              </li>
              <li style={styles.listItem}>
                <strong>Legal Compliance:</strong> To comply with applicable
                laws and regulations in Oman and internationally
              </li>
            </ul>
          </section>

          {/* 5. WhatsApp Messaging */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>5. WhatsApp Messaging</h2>
            <p style={styles.text}>
              We use the <strong>WhatsApp Business Cloud API</strong> (operated
              by Meta Platforms, Inc.) to communicate with customers. Our
              WhatsApp inbox is managed through{" "}
              <strong>NexaDesk</strong>, a multi-agent CRM platform. When
              you send us a WhatsApp message:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Your message is received and stored securely in our CRM system
              </li>
              <li style={styles.listItem}>
                Your WhatsApp name and phone number are saved to help us serve
                you better
              </li>
              <li style={styles.listItem}>
                Your message may be reviewed by our team members to provide the
                best response
              </li>
              <li style={styles.listItem}>
                AI technology may assist in drafting responses, but a human team
                member reviews before sending
              </li>
              <li style={styles.listItem}>
                We will never share your WhatsApp contact details with
                unauthorised third parties
              </li>
              <li style={styles.listItem}>
                You can opt out of WhatsApp communications at any time by
                replying &quot;STOP&quot;
              </li>
            </ul>
            <p style={styles.text}>
              By messaging us on WhatsApp, you consent to receiving replies and
              follow-up messages from our team through the same channel.
            </p>
          </section>

          {/* 6. Data Sharing */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>6. Data Sharing</h2>
            <p style={styles.text}>
              We do not sell your personal data. We may share your information
              only with trusted third-party service providers who help us operate
              our business:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>14Digital Limited (NexaDesk):</strong> Our CRM
                platform provider — stores and manages customer conversations
              </li>
              <li style={styles.listItem}>
                <strong>Meta Platforms, Inc.:</strong> Required for WhatsApp
                Business API messaging functionality
              </li>
              <li style={styles.listItem}>
                <strong>Google LLC:</strong> For writing replies (Gemini) and for
                transcribing voice notes (Cloud Speech-to-Text)
              </li>
              <li style={styles.listItem}>
                <strong>Law enforcement or regulatory authorities:</strong> When
                required by law or to protect our legal rights
              </li>
            </ul>
            <p style={styles.text}>
              All third-party providers are bound by data protection obligations
              and may only use your data for the specified purposes.
            </p>
          </section>

          {/* 7. Data Storage & Security */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              7. Data Storage &amp; Security
            </h2>
            <p style={styles.text}>
              We take the security of your personal data seriously:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Customer data is stored in secure, encrypted databases
              </li>
              <li style={styles.listItem}>
                All data transmissions use TLS/SSL encryption
              </li>
              <li style={styles.listItem}>
                Access to personal data is restricted to authorised team members
                only
              </li>
              <li style={styles.listItem}>
                We regularly review and update our security practices
              </li>
            </ul>
            <p style={styles.text}>
              Data may be stored on servers in the United Kingdom, European
              Union, or United States, where our technology providers operate,
              with appropriate data protection safeguards in place.
            </p>
          </section>

          {/* 8. Data Retention */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>8. Data Retention</h2>
            <p style={styles.text}>
              We retain your personal data for as long as necessary to provide
              our services. Specifically:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>WhatsApp conversation data:</strong> Retained for up to
                24 months
              </li>
              <li style={styles.listItem}>
                <strong>Booking and customer records:</strong> Retained for the
                duration of the business relationship plus 12 months
              </li>
              <li style={styles.listItem}>
                <strong>Website analytics data:</strong> Retained in anonymised
                form
              </li>
            </ul>
            <p style={styles.text}>
              You may request deletion of your data at any time by contacting us
              at{" "}
              <a href="mailto:thehelopersoman@gmail.com" style={styles.link}>
                thehelopersoman@gmail.com
              </a>
              .
            </p>
          </section>

          {/* 9. Cookies */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>9. Cookies</h2>
            <p style={styles.text}>
              Our website uses cookies to improve your browsing experience:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Essential Cookies:</strong> Required for the website to
                function properly
              </li>
              <li style={styles.listItem}>
                <strong>Analytics Cookies:</strong> To understand how visitors
                use our website
              </li>
            </ul>
            <p style={styles.text}>
              You can disable cookies through your browser settings, though some
              features of our website may not function correctly as a result.
            </p>
          </section>

          {/* 10. Your Rights */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>10. Your Rights</h2>
            <p style={styles.text}>
              You have the following rights regarding your personal data:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Access:</strong> Request a copy of the personal data we
                hold about you
              </li>
              <li style={styles.listItem}>
                <strong>Correction:</strong> Request correction of inaccurate or
                incomplete data
              </li>
              <li style={styles.listItem}>
                <strong>Deletion:</strong> Request deletion of your personal
                data
              </li>
              <li style={styles.listItem}>
                <strong>Opt-out:</strong> Opt out of WhatsApp or other marketing
                communications at any time
              </li>
              <li style={styles.listItem}>
                <strong>Objection:</strong> Object to the processing of your
                data in certain circumstances
              </li>
            </ul>
            <p style={styles.text}>
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:thehelopersoman@gmail.com" style={styles.link}>
                thehelopersoman@gmail.com
              </a>{" "}
              or via WhatsApp at{" "}
              <strong>+968 9281 1035</strong>.
            </p>
          </section>

          {/* 11. Children's Privacy */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              11. Children&apos;s Privacy
            </h2>
            <p style={styles.text}>
              Our services are intended for adults only. We do not knowingly
              collect personal data from individuals under the age of 18. If you
              believe we have inadvertently collected data from a minor, please
              contact us immediately and we will delete such information.
            </p>
          </section>

          {/* 12. Changes to This Policy */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              12. Changes to This Policy
            </h2>
            <p style={styles.text}>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices or legal requirements. Any updates will be
              posted on this page with a new &quot;Last Updated&quot; date. We
              encourage you to review this policy periodically.
            </p>
          </section>

          {/* 13. Contact Us */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>13. Contact Us</h2>
            <p style={styles.text}>
              If you have any questions or concerns about this Privacy Policy or
              how we handle your personal data, please get in touch:
            </p>
            <div style={styles.infoCard}>
              <p style={styles.text}>
                <strong>The Helpers Oman</strong>
              </p>
              <p style={styles.text}>
                📍 Muscat &amp; Nizwa, Oman
              </p>
              <p style={styles.text}>
                📧{" "}
                <a href="mailto:thehelopersoman@gmail.com" style={styles.link}>
                  thehelopersoman@gmail.com
                </a>
              </p>
              <p style={styles.text}>
                📞 Muscat: 9281 1035 / 7676 0110 / 9981 1034
              </p>
              <p style={styles.text}>
                📞 Nizwa: 7676 8110 / 7676 7110
              </p>
              <p style={styles.text}>
                🌐{" "}
                <a
                  href="https://thehelpersoman.com"
                  style={styles.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://thehelpersoman.com
                </a>
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            © 2026 The Helpers Oman. All rights reserved. |{" "}
            <a href="/terms" style={styles.footerLink}>
              Terms of Service
            </a>
            {" "}| WhatsApp CRM powered by{" "}
            <a
              href="https://nexadesk.app"
              style={styles.footerLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              NexaDesk
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #2d1b00 0%, #4d3179 50%, #1a0533 100%)",
    padding: "40px 20px",
    fontFamily: "'Figtree', 'Inter', system-ui, -apple-system, sans-serif",
  },
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "24px",
    overflow: "hidden",
  },
  header: {
    textAlign: "center" as const,
    padding: "48px 40px 32px",
    background: "linear-gradient(135deg, rgba(198, 158, 99, 0.15), rgba(77, 49, 121, 0.2))",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  logoMark: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #C69E63, #4D3179)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    fontSize: "20px",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: "1px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#fff",
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "15px",
    color: "rgba(255, 255, 255, 0.55)",
    margin: "0 0 16px",
    fontWeight: "400",
  },
  effectiveDate: {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.4)",
    margin: "0",
  },
  body: {
    padding: "32px 40px",
  },
  section: {
    marginBottom: "32px",
  },
  sectionTitle: {
    fontSize: "19px",
    fontWeight: "600",
    color: "#e9d5a8",
    margin: "0 0 14px",
    paddingBottom: "10px",
    borderBottom: "1px solid rgba(198, 158, 99, 0.2)",
  },
  subsectionTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#c7b08c",
    margin: "18px 0 10px",
  },
  text: {
    fontSize: "14.5px",
    lineHeight: "1.75",
    color: "rgba(255, 255, 255, 0.72)",
    margin: "0 0 10px",
  },
  link: {
    color: "#C69E63",
    textDecoration: "none",
  },
  list: {
    paddingLeft: "20px",
    margin: "10px 0",
  },
  listItem: {
    fontSize: "14.5px",
    lineHeight: "1.75",
    color: "rgba(255, 255, 255, 0.65)",
    marginBottom: "7px",
  },
  infoCard: {
    background: "rgba(198, 158, 99, 0.06)",
    border: "1px solid rgba(198, 158, 99, 0.2)",
    borderRadius: "12px",
    padding: "20px 24px",
    marginTop: "10px",
  },
  footer: {
    textAlign: "center" as const,
    padding: "24px 40px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    background: "rgba(0, 0, 0, 0.2)",
  },
  footerText: {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.35)",
    margin: "0",
  },
  footerLink: {
    color: "#C69E63",
    textDecoration: "none",
  },
};
