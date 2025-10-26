import React from 'react';
import Image from 'next/image';

export default function ExportHeader() {
  return (
    <div className="export-header" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0 0 0',
      backgroundColor: '#fff',
      marginBottom: '10px',
    }}>
      {/* Logo Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '40px',
        marginBottom: '8px',
      }}>
        {/* MINSU Logo */}
        <Image
          src="/misulogo.png"
          alt="MINSU Logo"
          width={70}
          height={70}
          style={{ objectFit: 'cover', borderRadius: '50%', border: '2px solid #ccc', background: '#fff' }}
        />
        {/* CCS Logo */}
        <Image
          src="/ccslogo.png"
          alt="CCS Logo"
          width={70}
          height={70}
          style={{ objectFit: 'cover', borderRadius: '50%', border: '2px solid #ccc', background: '#fff' }}
        />
        {/* MEGG Logo */}
        <Image
          src="/logo.png"
          alt="MEGG Logo"
          width={70}
          height={70}
          style={{ objectFit: 'cover', borderRadius: '50%', border: '2px solid #ccc', background: '#fff' }}
        />
      </div>
      {/* Vertical Divider */}
      <div style={{
        width: '1px',
        height: '24px',
        background: '#333',
        margin: '0 auto 12px auto',
      }} />
      {/* Institutional Information */}
      <div style={{
        textAlign: 'center',
        lineHeight: '1.4',
        color: '#222',
        fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{ fontSize: '20px', fontWeight: 500 }}>Republic of the Philippines</div>
        <div style={{ fontSize: '18px', fontWeight: 500 }}>Mindoro State University</div>
        <div style={{ fontSize: '17px', fontWeight: 500 }}>A's Duck Farm</div>
        <div style={{ fontSize: '16px', fontWeight: 400 }}>Mangangan I, Baco Oriental Mindoro</div>
      </div>
    </div>
  );
}

// CSS for print/export styles
export const exportHeaderStyles = `
  .export-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-bottom: 2px solid #333;
    margin-bottom: 20px;
    background-color: #f8f9fa;
    page-break-inside: avoid;
  }
  
  .export-header .logo-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 40px;
    margin-bottom: 15px;
  }
  
  .export-header .logo-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  
  .export-header .logo-item img {
    width: 60px;
    height: 60px;
    object-fit: contain;
  }
  
  .export-header .logo-label {
    font-size: 12px;
    font-weight: bold;
  }
  
  .export-header .logo-label.minsu {
    color: #1e40af;
  }
  
  .export-header .logo-label.ccs {
    color: #1e40af;
  }
  
  .export-header .logo-label.megg {
    color: #ea580c;
  }
  
  .export-header .institutional-info {
    text-align: center;
    line-height: 1.4;
  }
  
  .export-header .institutional-info h1 {
    font-size: 18px;
    font-weight: bold;
    color: #1f2937;
    margin: 0 0 5px 0;
  }
  
  .export-header .institutional-info h2 {
    font-size: 16px;
    font-weight: bold;
    color: #374151;
    margin: 0 0 5px 0;
  }
  
  .export-header .institutional-info h3 {
    font-size: 14px;
    font-weight: bold;
    color: #4b5563;
    margin: 0 0 5px 0;
  }
  
  .export-header .institutional-info p {
    font-size: 12px;
    color: #6b7280;
    margin: 0;
  }
`; 