import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';
import { getSiteUrl } from '@/lib/site-config';
import {
  Section,
  Text,
  Link,
  Heading,
} from '@react-email/components';

interface AffiliateApprovalEmailProps {
  name: string;
  code: string;
  locale: 'ro' | 'en';
  loginUrl: string;
  commission?: number;
  isUpdate?: boolean;
  isApplicationReceived?: boolean;
}

export const AffiliateApprovalEmail = ({
  name,
  code,
  locale,
  loginUrl,
  commission = 10,
  isUpdate = false,
  isApplicationReceived = false,
}: AffiliateApprovalEmailProps) => {
  const isRo = locale === 'ro';

  const previewText = isApplicationReceived
    ? (isRo ? 'Am primit cererea ta de parteneriat TrenZone!' : 'We received your TrenZone partner application!')
    : isRo
      ? (isUpdate ? 'Profilul tău de afiliat a fost actualizat!' : 'Aplicația ta de afiliat a fost aprobată!')
      : (isUpdate ? 'Your affiliate profile has been updated!' : 'Your affiliate application has been approved!');

  const baseUrl = getSiteUrl();
  const referralLink = code ? `${baseUrl}/${locale}?ref=${encodeURIComponent(code)}` : `${baseUrl}/${locale}`;

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} previewText={previewText}>
      {/* Main Content */}
      <Section style={content}>
        <Heading style={heading}>
          {isApplicationReceived
            ? (isRo ? 'Cerere Înregistrată' : 'Application Received')
            : isRo
              ? (isUpdate ? 'Actualizare Profil' : 'Bine ai venit în echipă!')
              : (isUpdate ? 'Profile Update' : 'Welcome to the team!')}
        </Heading>

        <Text style={paragraph}>
          {isRo ? `Salut, ${name},` : `Hi ${name},`}
        </Text>

        {isApplicationReceived ? (
          <>
            <Text style={paragraph}>
              {isRo
                ? 'Îți mulțumim că ai aplicat în Programul de Afiliere TrenZone! Cererea ta a fost înregistrată și se află acum în curs de verificare.'
                : 'Thank you for applying to the TrenZone Affiliate Program! Your application has been received and is currently under review.'}
            </Text>
            {code ? (
              <Text style={paragraph}>
                {isRo
                  ? `Cod preferat solicitat: ${code}. Imediat ce un administrator aprobă contul tău, vei primi un email de confirmare cu codul activ și accesul în Dashboard-ul de partener.`
                  : `Requested code: ${code}. As soon as an administrator approves your account, you will receive a confirmation email with your active code and Partner Dashboard access.`}
              </Text>
            ) : (
              <Text style={paragraph}>
                {isRo
                  ? 'Imediat ce un administrator aprobă cererea ta, vei primi un email cu codul tău unic de reducere și linkul de conectare în Dashboard-ul de partener.'
                  : 'As soon as an administrator approves your application, you will receive an email with your unique discount code and Partner Dashboard login link.'}
              </Text>
            )}
            <Text style={paragraph}>
              {isRo
                ? `După aprobare, te vei putea conecta aici cu adresa ta de email, codul primit și confirmarea rapidă prin cod unic pe email: `
                : `Once approved, you will be able to sign in here using your email address, received code, and quick email verification: `}
              <Link href={loginUrl} style={{ color: '#e32f8c', fontWeight: 'bold' }}>{loginUrl}</Link>
            </Text>
          </>
        ) : (
          <>
            <Text style={paragraph}>
              {isRo 
                ? (isUpdate 
                  ? 'Datele tale de afiliat au fost actualizate de echipa noastră. Mai jos este noul tău cod de reducere pe care îl poți oferi urmăritorilor tăi:'
                  : 'Ne bucurăm să te anunțăm că cererea ta de afiliere a fost aprobată cu succes! Mai jos este codul tău unic de reducere pe care îl poți oferi urmăritorilor tăi:')
                : (isUpdate
                  ? 'Your affiliate details have been updated by our team. Below is your new unique discount code that you can share with your audience:'
                  : 'We are excited to let you know that your affiliate application has been approved! Below is your unique discount code that you can share with your audience:')}
            </Text>

            <Section style={codeBox}>
              <Text style={codeText}>{code}</Text>
            </Section>
            
            <Text style={{...paragraph, fontWeight: 'bold', color: '#000000'}}>
              {isRo
                ? `Comisionul tău actual: ${commission}%`
                : `Your current commission: ${commission}%`}
            </Text>

            <Text style={paragraph}>
              {isRo ? 'Linkul tău de afiliere (cu codul pre-aplicat în coș): ' : 'Your referral link (auto-applies discount in cart): '}
              <Link href={referralLink} style={{ color: '#e32f8c', fontWeight: 'bold' }}>{referralLink}</Link>
            </Text>

            <Text style={paragraph}>
              {isRo
                ? 'Am creat un panou special (Dashboard) unde îți poți urmări în timp real vânzările, comisioanele generate și unde îți poți salva contul IBAN pentru încasări. Pentru conectare folosește această adresă de email, codul tău de afiliat și codul de verificare pe care îl vei primi instant pe email.'
                : 'We created a dedicated Dashboard where you can track your sales and generated commissions in real time and save your bank details for payouts. To log in, use this email address, your affiliate code, and the one-time verification code sent instantly to your email.'}
            </Text>

            <Section style={buttonContainer}>
              <Link href={loginUrl} style={button}>
                {isRo ? 'Accesează Dashboard-ul Tău' : 'Access Your Dashboard'}
              </Link>
            </Section>

            <Text style={{ ...paragraph, fontSize: '12px', color: '#71717a', textAlign: 'center' as const }}>
              {isRo ? 'Link direct conectare: ' : 'Direct login URL: '}
              <Link href={loginUrl} style={{ color: '#52525b' }}>{loginUrl}</Link>
            </Text>
          </>
        )}
      </Section>
    </BaseEmailLayout>
  );
};

// Styles
const content = {
  padding: '40px 20px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '800',
  color: '#000000',
  padding: '17px 0 0',
  textTransform: 'uppercase' as const,
  fontStyle: 'italic',
};

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.5',
  color: '#3c3f44',
};

const codeBox = {
  background: '#f4f4f5',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px dashed #e4e4e7',
};

const codeText = {
  margin: '0',
  color: '#000000',
  fontSize: '32px',
  fontWeight: '900',
  letterSpacing: '6px',
  textTransform: 'uppercase' as const,
  fontFamily: 'monospace',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#e32f8c',
  borderRadius: '12px',
  color: '#000000',
  fontSize: '14px',
  fontWeight: '800',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  width: '100%',
  maxWidth: '280px',
  padding: '16px 24px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

export default AffiliateApprovalEmail;
