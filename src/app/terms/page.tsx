import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — The Helpers Oman",
  description:
    "Terms of Service for The Helpers Oman. Please read these terms carefully before using our services.",
};

export default function TermsOfServicePage() {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.logoMark}>TH</div>
          <h1 style={styles.title}>Terms of Service</h1>
          <p style={styles.subtitle}>The Helpers Oman — Manpower Services</p>
          <p style={styles.effectiveDate}>
            <strong>Effective Date:</strong> 15 June 2026 &nbsp;|&nbsp;
            <strong>Last Updated:</strong> 15 June 2026
          </p>
        </header>

        {/* Body */}
        <main style={styles.body}>
          {/* 1. Agreement */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>1. Agreement to Terms</h2>
            <p style={styles.text}>
              By contacting <strong>The Helpers Oman</strong>, using our
              website at{" "}
              <a
                href="https://thehelpersoman.com"
                style={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                thehelpersoman.com
              </a>
              , messaging us via WhatsApp, or booking any of our services, you
              agree to be bound by these Terms of Service (&quot;Terms&quot;).
            </p>
            <p style={styles.text}>
              If you do not agree to these Terms, please do not use our
              services.
            </p>
          </section>

          {/* 2. About Us */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>2. About The Helpers Oman</h2>
            <p style={styles.text}>
              The Helpers Oman is a professional manpower and home services
              company providing reliable household staff, cleaners, and support
              workers across Oman. We operate from offices in Muscat and Nizwa.
            </p>
            <div style={styles.infoCard}>
              <p style={styles.text}>
                <strong>Business Name:</strong> The Helpers Oman
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
                <strong>Email:</strong>{" "}
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

          {/* 3. Our Services */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>3. Our Services</h2>
            <p style={styles.text}>
              The Helpers Oman provides the following services:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Home Cleaning &amp; Housekeeping:</strong> Regular and
                deep cleaning services for residential properties
              </li>
              <li style={styles.listItem}>
                <strong>Domestic Staff Placement:</strong> Sourcing and placing
                qualified domestic helpers, maids, and support staff
              </li>
              <li style={styles.listItem}>
                <strong>Babysitting &amp; Childcare:</strong> Trained and
                vetted childcare support
              </li>
              <li style={styles.listItem}>
                <strong>Elderly Care Assistance:</strong> Compassionate support
                for elderly family members
              </li>
              <li style={styles.listItem}>
                <strong>General Household Support:</strong> Cooking, laundry,
                and other household management tasks
              </li>
            </ul>
            <p style={styles.text}>
              Specific service terms, pricing, and availability are confirmed at
              the time of booking.
            </p>
          </section>

          {/* 4. WhatsApp Communications */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              4. WhatsApp Business Communications
            </h2>
            <p style={styles.text}>
              We use <strong>WhatsApp Business</strong> as a primary channel for
              customer communication, powered by the{" "}
              <strong>WhatsApp Business Cloud API</strong> (Meta Platforms,
              Inc.) and managed through <strong>Glow Studio Desk</strong> (a CRM
              tool by 14Digital Limited, UK).
            </p>
            <p style={styles.text}>
              By messaging us on WhatsApp, you agree to:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Receiving replies and service-related messages from our team
              </li>
              <li style={styles.listItem}>
                Your conversation being handled by one or more of our trained
                staff members
              </li>
              <li style={styles.listItem}>
                AI-assisted responses being used to provide faster service
                (always reviewed by a human before sending)
              </li>
              <li style={styles.listItem}>
                Your message history being stored securely for service
                continuity
              </li>
            </ul>
            <p style={styles.text}>
              WhatsApp messaging is subject to{" "}
              <a
                href="https://www.whatsapp.com/legal/business-policy"
                style={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp&apos;s Business Policy
              </a>{" "}
              and{" "}
              <a
                href="https://www.whatsapp.com/legal/commerce-policy"
                style={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Commerce Policy
              </a>
              .
            </p>
            <p style={styles.text}>
              You may opt out of WhatsApp communications at any time by replying
              &quot;STOP&quot; or contacting us directly.
            </p>
          </section>

          {/* 5. Bookings & Appointments */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              5. Bookings &amp; Appointments
            </h2>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Bookings can be made via WhatsApp, phone call, or our website
                contact form
              </li>
              <li style={styles.listItem}>
                All bookings are subject to staff availability and confirmation
                by our team
              </li>
              <li style={styles.listItem}>
                We reserve the right to reschedule or cancel appointments with
                reasonable notice
              </li>
              <li style={styles.listItem}>
                Cancellations by the customer must be made at least 24 hours in
                advance
              </li>
              <li style={styles.listItem}>
                Pricing is agreed upon at the time of booking and may vary based
                on service type, duration, and location
              </li>
            </ul>
          </section>

          {/* 6. Customer Responsibilities */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              6. Customer Responsibilities
            </h2>
            <p style={styles.text}>As our customer, you agree to:</p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Provide accurate information when making enquiries or bookings
              </li>
              <li style={styles.listItem}>
                Ensure a safe working environment for our staff
              </li>
              <li style={styles.listItem}>
                Treat our staff members with respect and dignity
              </li>
              <li style={styles.listItem}>
                Not request services that are illegal, unsafe, or outside the
                agreed scope of work
              </li>
              <li style={styles.listItem}>
                Make payments as agreed at the time of booking
              </li>
            </ul>
          </section>

          {/* 7. Acceptable WhatsApp Use */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              7. Acceptable WhatsApp Use
            </h2>
            <p style={styles.text}>
              When communicating with us via WhatsApp, you agree not to:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Send spam, unsolicited bulk messages, or irrelevant content
              </li>
              <li style={styles.listItem}>
                Use abusive, threatening, or harassing language
              </li>
              <li style={styles.listItem}>
                Share illegal, offensive, or misleading content
              </li>
              <li style={styles.listItem}>
                Impersonate any person or make false claims
              </li>
            </ul>
            <p style={styles.text}>
              We reserve the right to block users who violate these guidelines.
            </p>
          </section>

          {/* 8. Privacy */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>8. Privacy</h2>
            <p style={styles.text}>
              Your use of our services is also governed by our{" "}
              <a href="/privacy-policy" style={styles.link}>
                Privacy Policy
              </a>
              , which explains how we collect, use, and protect your personal
              data. By using our services, you consent to the practices described
              in our Privacy Policy.
            </p>
          </section>

          {/* 9. Limitation of Liability */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>9. Limitation of Liability</h2>
            <p style={styles.text}>
              While we take every care to provide high-quality services, The
              Helpers Oman shall not be liable for:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Any indirect, incidental, or consequential loss arising from
                the use of our services
              </li>
              <li style={styles.listItem}>
                Delays or service disruptions caused by circumstances beyond our
                reasonable control
              </li>
              <li style={styles.listItem}>
                Any issues arising from inaccurate information provided by the
                customer
              </li>
              <li style={styles.listItem}>
                Temporary unavailability of WhatsApp or our website
              </li>
            </ul>
            <p style={styles.text}>
              Our total liability for any claim shall not exceed the amount paid
              for the specific service in question.
            </p>
          </section>

          {/* 10. Modifications */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              10. Modifications to These Terms
            </h2>
            <p style={styles.text}>
              We reserve the right to update these Terms at any time. Changes
              will be posted on this page with an updated &quot;Last
              Updated&quot; date. Your continued use of our services after any
              changes constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* 11. Governing Law */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>11. Governing Law</h2>
            <p style={styles.text}>
              These Terms shall be governed by and construed in accordance with
              the laws of the <strong>Sultanate of Oman</strong>. Any disputes
              shall be subject to the jurisdiction of the courts of Oman.
            </p>
          </section>

          {/* 12. Contact Us */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>12. Contact Us</h2>
            <p style={styles.text}>
              For any questions about these Terms, or to make a service enquiry,
              please contact us:
            </p>
            <div style={styles.infoCard}>
              <p style={styles.text}>
                <strong>The Helpers Oman</strong>
              </p>
              <p style={styles.text}>📍 Muscat &amp; Nizwa, Oman</p>
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
              <p style={styles.text}>
                💬 WhatsApp us directly via our website
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            © 2026 The Helpers Oman. All rights reserved. |{" "}
            <a href="/privacy-policy" style={styles.footerLink}>
              Privacy Policy
            </a>
            {" "}| WhatsApp CRM powered by{" "}
            <a
              href="https://glowstudiodesk.app"
              style={styles.footerLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Glow Studio Desk
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
