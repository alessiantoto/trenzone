import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';
import { getSiteUrl } from '@/lib/site-config';

export interface ProgramDeliveryEmailProps {
  customerName: string;
  orderId: string;
  locale?: 'ro' | 'en';
  mode?: 'delivery' | 'pending' | 'marketing';
  programs?: Array<{
    title: string;
    lang: 'ro' | 'en';
    downloadUrl: string;
  }>;
  pendingPrograms?: Array<{
    title: string;
    lang: 'ro' | 'en';
  }>;
  programsPageUrl?: string;
  baseUrl?: string;
  userEmail?: string;
  customContent?: {
    heading?: string;
    subheading?: string;
    body_intro?: string;
    cta_text?: string;
    footer_text?: string;
  };
}

export const ProgramDeliveryEmail: React.FC<ProgramDeliveryEmailProps> = ({
  customerName = 'Alex',
  orderId = '1050',
  locale = 'ro',
  mode = 'delivery',
  programs = [
    {
      title: 'Food Plan',
      lang: 'ro',
      downloadUrl: 'https://trenzone.fit/ro/programs',
    },
    {
      title: 'Bench Program',
      lang: 'ro',
      downloadUrl: 'https://trenzone.fit/ro/programs',
    },
  ],
  pendingPrograms = [],
  programsPageUrl = 'https://trenzone.fit/ro/programs',
  baseUrl = getSiteUrl(),
  userEmail,
  customContent,
}) => {
  const isEn = locale === 'en';
  const isMarketing = mode === 'marketing';
  const isPending = mode === 'pending';
  const firstCustomerName = (customerName || '').trim().split(/\s+/)[0] || customerName;

  const defaultHeading = isMarketing
    ? isEn
      ? 'OFFICIAL DIGITAL PROGRAMS'
      : 'PROGRAME DIGITALE OFICIALE'
    : isPending
      ? isEn
        ? 'ORDER CONFIRMED · COMING SOON'
        : 'COMANDA CONFIRMATĂ · URMEAZĂ CURÂND'
      : isEn
        ? 'YOUR DIGITAL PROGRAMS ARE READY'
        : 'PROGRAMELE TALE DIGITALE SUNT GATA';

  const defaultSubheading = isMarketing
    ? 'Food Plan · Training · Bench Program (PDF)'
    : isPending
      ? isEn
        ? `ORDER #${orderId} · PDF IN PREPARATION`
        : `COMANDA #${orderId} · PDF ÎN PREGĂTIRE`
      : isEn
        ? `ORDER #${orderId} · PDF ACCESS`
        : `COMANDA #${orderId} · ACCES PDF`;

  const defaultIntro = isMarketing
    ? isEn
      ? `Hi ${firstCustomerName}, alongside your strength gear, discover our official PDF guides: Food Plan, Training Program & Bench Program, available in English and Romanian.`
      : `Salut ${firstCustomerName}, pe lângă echipamentul de sală, descoperă ghidurile oficiale în format PDF: Food Plan, Training Program și Bench Program, disponibile în Engleză și Română.`
    : isPending
      ? isEn
        ? `Thank you for your order, ${firstCustomerName}! We have confirmed your purchase of the digital program(s) below. The final PDF files are currently being prepared and will arrive automatically on this email very soon.`
        : `Îți mulțumim pentru comandă, ${firstCustomerName}! Am înregistrat achiziția ta pentru programele digitale de mai jos. Fișierele PDF finale sunt în curs de pregătire și le vei primi automat pe acest email în cel mai scurt timp.`
      : isEn
        ? `Thank you for your order, ${firstCustomerName}. Your official PDF program(s) are attached directly to this email and can also be downloaded anytime using the links below.`
        : `Îți mulțumim pentru comandă, ${firstCustomerName}. Programele tale digitale în format PDF sunt atașate direct la acest email și pot fi descărcate oricând folosind butoanele de mai jos.`;

  const defaultCta = isMarketing
    ? isEn
      ? 'VIEW PROGRAMS'
      : 'VEZI PROGRAMELE'
    : isPending
      ? isEn
        ? 'VIEW PROGRAMS'
        : 'VEZI PROGRAMELE'
      : isEn
        ? 'DOWNLOAD PDF'
        : 'DESCARCĂ PDF';

  const heading = (customContent?.heading || defaultHeading)
    .replace(/\{\{name\}\}/g, firstCustomerName)
    .replace(/\{\{order_id\}\}/g, orderId)
    .replace(/\{\{id\}\}/g, orderId);
  const subheading = (customContent?.subheading || defaultSubheading)
    .replace(/\{\{name\}\}/g, firstCustomerName)
    .replace(/\{\{order_id\}\}/g, orderId)
    .replace(/\{\{id\}\}/g, orderId);
  const intro = (customContent?.body_intro || defaultIntro)
    .replace(/\{\{name\}\}/g, firstCustomerName)
    .replace(/\{\{order_id\}\}/g, orderId)
    .replace(/\{\{id\}\}/g, orderId);
  const ctaText = customContent?.cta_text || defaultCta;

  return (
    <BaseEmailLayout
      locale={locale}
      baseUrl={baseUrl}
      userEmail={userEmail}
      previewText={`${heading} — ${subheading}`}
    >
      <div style={{ padding: '50px 30px', textAlign: 'center' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: '900',
            letterSpacing: '2px',
            color: '#888888',
            textTransform: 'uppercase',
            margin: '0 0 12px 0',
          }}
        >
          {subheading}
        </p>

        <h2
          style={{
            fontSize: '28px',
            fontWeight: '900',
            color: '#000000',
            textTransform: 'uppercase',
            margin: '0 0 20px 0',
            letterSpacing: '-0.5px',
          }}
        >
          {heading}
        </h2>

        <p
          style={{
            fontSize: '15px',
            color: '#444444',
            lineHeight: '1.65',
            maxWidth: '480px',
            margin: '0 auto 36px auto',
          }}
        >
          {intro}
        </p>

        {!isMarketing && !isPending ? (
          <>
            <div
              style={{
                backgroundColor: '#f9f9f9',
                border: '2px dashed #dddddd',
                borderRadius: '16px',
                padding: '32px 24px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: '900',
                  letterSpacing: '2px',
                  color: '#888888',
                  textTransform: 'uppercase',
                  margin: '0 0 20px 0',
                }}
              >
                {isEn ? 'ATTACHED PDF FILES' : 'FIȘIERE PDF ATAȘATE'}
              </p>

              {programs.map((prog, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: idx < programs.length - 1 ? '14px' : '0',
                  }}
                >
                  <p
                    style={{
                      fontSize: '16px',
                      fontWeight: '900',
                      color: '#000000',
                      textTransform: 'uppercase',
                      margin: '0 0 6px 0',
                    }}
                  >
                    {prog.title}
                  </p>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#777777',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      margin: '0 0 16px 0',
                    }}
                  >
                    {prog.lang === 'en' ? 'ENGLISH · PDF' : 'ROMÂNĂ · PDF'}
                  </p>

                  <a
                    href={prog.downloadUrl}
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      padding: '14px 36px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '900',
                      fontSize: '12px',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {ctaText}
                  </a>
                </div>
              ))}
            </div>

            {pendingPrograms.length > 0 && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '14px',
                  padding: '22px 20px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: '900',
                    letterSpacing: '1.5px',
                    color: '#b45309',
                    textTransform: 'uppercase',
                    margin: '0 0 12px 0',
                  }}
                >
                  {isEn ? 'COMING SOON BY EMAIL' : 'URMEAZĂ CURÂND PE EMAIL'}
                </p>
                {pendingPrograms.map((prog, idx) => (
                  <p
                    key={idx}
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#111111',
                      margin: idx < pendingPrograms.length - 1 ? '0 0 6px 0' : '0',
                    }}
                  >
                    {prog.title} ({prog.lang === 'en' ? 'EN' : 'RO'})
                  </p>
                ))}
              </div>
            )}
          </>
        ) : isPending ? (
          <div
            style={{
              backgroundColor: '#f9f9f9',
              border: '2px dashed #e5e5e5',
              borderRadius: '16px',
              padding: '32px 24px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: '900',
                letterSpacing: '2px',
                color: '#d97706',
                textTransform: 'uppercase',
                margin: '0 0 18px 0',
              }}
            >
              {isEn ? 'PURCHASED DIGITAL PROGRAMS' : 'PROGRAME DIGITALE ACHIZIȚIONATE'}
            </p>

            {(pendingPrograms.length > 0 ? pendingPrograms : programs).map((prog, idx, arr) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  marginBottom: idx < arr.length - 1 ? '12px' : '0',
                }}
              >
                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: '900',
                    color: '#000000',
                    textTransform: 'uppercase',
                    margin: '0 0 6px 0',
                  }}
                >
                  {prog.title}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#777777',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    margin: '0 0 10px 0',
                  }}
                >
                  {prog.lang === 'en' ? 'ENGLISH · PDF' : 'ROMÂNĂ · PDF'}
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  {isEn ? 'COMING SOON TO YOUR INBOX' : 'VEI PRIMI PDF-UL CURÂND PE EMAIL'}
                </span>
              </div>
            ))}

            <p
              style={{
                fontSize: '12px',
                color: '#666666',
                lineHeight: '1.5',
                margin: '20px 0 0 0',
              }}
            >
              {isEn
                ? 'No action needed from your side — we will email you as soon as the PDF is ready.'
                : 'Nu trebuie să faci nimic — îți trimitem automat fișierul PDF pe această adresă imediat ce este finalizat.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#f9f9f9',
              border: '2px dashed #dddddd',
              borderRadius: '16px',
              padding: '36px 28px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: '900',
                letterSpacing: '2px',
                color: '#888888',
                textTransform: 'uppercase',
                margin: '0 0 10px 0',
              }}
            >
              {isEn ? 'COMPLETE BUNDLE' : 'PACHET COMPLET'}
            </p>
            <h3
              style={{
                fontSize: '22px',
                fontWeight: '900',
                color: '#000000',
                textTransform: 'uppercase',
                margin: '0 0 12px 0',
              }}
            >
              FOOD PLAN + BENCH PROGRAM
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#666666',
                lineHeight: '1.5',
                margin: '0 0 26px 0',
              }}
            >
              {isEn
                ? 'Available in English (PDF) and Romanian (PDF) with instant email delivery.'
                : 'Disponibil în Română (PDF) și Engleză (PDF) cu livrare instantă pe email.'}
            </p>

            <a
              href={programsPageUrl}
              style={{
                display: 'inline-block',
                backgroundColor: '#000000',
                color: '#ffffff',
                padding: '16px 44px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '900',
                fontSize: '13px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </BaseEmailLayout>
  );
};
