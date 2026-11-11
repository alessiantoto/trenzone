import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';
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
}

export const AffiliateApprovalEmail = ({
  name,
  code,
  locale,
  loginUrl,
  commission = 10,
  isUpdate = false,
}: AffiliateApprovalEmailProps) => {
  const isRo = locale === 'ro';

  const previewText = isRo 
    ? (isUpdate ? 'Profilul tău de afiliat a fost actualizat!' : 'Aplicația ta de afiliat a fost aprobată!')
    : (isUpdate ? 'Your affiliate profile has been updated!' : 'Your affiliate application has been approved!');

  // Assuming NEXT_PUBLIC_SITE_URL is available during email rendering or default
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trenzone.fit';

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} previewText={previewText}>
      {/* Main Content */}
      <Section style={content}>
        <Heading style={heading}>
          {isRo 
            ? (isUpdate ? 'Actualizare Profil' : 'Bine ai venit în echipă!') 
            : (isUpdate ? 'Profile Update' : 'Welcome to the team!')}
        </Heading>

        <Text style={paragraph}>
          {isRo ? `Salut, ${name},` : `Hi ${name},`}
        </Text>

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
          {isRo
            ? 'Am creat un panou special (Dashboard) unde îți poți urmări în timp real vânzările și comisioanele generate. Pentru a te conecta, vei avea nevoie doar de această adresă de email și de codul tău de afiliat de mai sus.'
            : 'We created a special Dashboard where you can track your sales and generated commissions in real time. To log in, you will only need this email address and your affiliate code from above.'}
        </Text>

        <Section style={buttonContainer}>
          <Link href={loginUrl} style={button}>
            {isRo ? 'Accesează Dashboard-ul Tău' : 'Access Your Dashboard'}
          </Link>
        </Section>
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
