import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';
import { getSiteUrl } from '@/lib/site-config';
import {
  Section,
  Text,
  Link,
  Heading,
} from '@react-email/components';

interface AffiliateOtpEmailProps {
  name: string;
  affiliateCode: string;
  otpCode: string;
  magicLinkUrl: string;
  locale: 'ro' | 'en';
  expiresMinutes?: number;
}

export const AffiliateOtpEmail = ({
  name,
  affiliateCode,
  otpCode,
  magicLinkUrl,
  locale,
  expiresMinutes = 10,
}: AffiliateOtpEmailProps) => {
  const isRo = locale === 'ro';
  const baseUrl = getSiteUrl();
  const displayOtp = otpCode.length === 6 ? `${otpCode.slice(0, 3)} ${otpCode.slice(3)}` : otpCode;

  const previewText = isRo
    ? `Codul tău de verificare TrenZone: ${otpCode} (valabil ${expiresMinutes} min)`
    : `Your TrenZone verification code: ${otpCode} (valid ${expiresMinutes} min)`;

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} previewText={previewText}>
      <Section style={content}>
        <Heading style={heading}>
          {isRo ? 'Confirmă Conectarea' : 'Confirm Sign In'}
        </Heading>

        <Text style={paragraph}>
          {isRo ? `Salut${name ? `, ${name}` : ''},` : `Hi${name ? ` ${name}` : ''},`}
        </Text>

        <Text style={paragraph}>
          {isRo
            ? `Am primit o cerere de conectare în Dashboard-ul de partener (${affiliateCode}). Introdu codul de verificare de mai jos sau apasă direct pe butonul de acces rapid:`
            : `We received a sign-in request for your Partner Dashboard (${affiliateCode}). Enter the verification code below or click the instant sign-in button:`}
        </Text>

        <Section style={codeBox}>
          <Text style={codeLabel}>
            {isRo ? 'COD UNIC DE VERIFICARE' : 'ONE-TIME VERIFICATION CODE'}
          </Text>
          <Text style={codeText}>{displayOtp}</Text>
          <Text style={codeMeta}>
            {isRo
              ? `Valabil ${expiresMinutes} minute • O singură utilizare`
              : `Valid for ${expiresMinutes} minutes • Single use`}
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Link href={magicLinkUrl} style={button}>
            {isRo ? 'Intră în cont acum' : 'Sign In Instantly'}
          </Link>
        </Section>

        <Text style={{ ...paragraph, fontSize: '13px', color: '#52525b' }}>
          {isRo
            ? 'După confirmare, sesiunea ta rămâne activă timp de 60 de zile pe acest dispozitiv.'
            : 'Once verified, your session stays active for 60 days on this device.'}
        </Text>

        <Text style={{ ...paragraph, fontSize: '12px', color: '#71717a', marginBottom: '0' }}>
          {isRo
            ? 'Dacă nu ai inițiat această conectare, poți ignora în siguranță acest email — accesul fără cod nu este permis.'
            : 'If you did not request this sign-in, you can safely ignore this email — no access is granted without verification.'}
        </Text>
      </Section>
    </BaseEmailLayout>
  );
};

const content = {
  padding: '36px 20px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '800',
  color: '#000000',
  padding: '8px 0 0',
  textTransform: 'uppercase' as const,
  fontStyle: 'italic',
};

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.55',
  color: '#3c3f44',
};

const codeBox = {
  background: '#0a0a0e',
  borderRadius: '14px',
  padding: '24px 20px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px solid #e32f8c',
};

const codeLabel = {
  margin: '0 0 8px',
  color: '#ff66b2',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
};

const codeText = {
  margin: '0',
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: '900',
  letterSpacing: '6px',
  fontFamily: 'monospace',
};

const codeMeta = {
  margin: '10px 0 0',
  color: '#a1a1aa',
  fontSize: '12px',
  fontWeight: '600',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '26px 0 24px',
};

const button = {
  backgroundColor: '#e32f8c',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '800',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  width: '100%',
  maxWidth: '280px',
  padding: '15px 24px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

export default AffiliateOtpEmail;

