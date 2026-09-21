import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export interface ThreatData {
  id: number;
  type: string;
  severity: string;
  source: string;
  target: string;
  protocol: string;
  port: string;
  timestamp: string;
  status: string;
  confidence: number;
  description: string;
  attackCategory?: string;
  riskLevel?: string;
}

export interface NetworkData {
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  packetSize: number;
  classification: string;
  confidence: number;
}

export const exportThreatsToPDF = (threats: ThreatData[], filename = 'threat-report') => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 123, 255); // Primary blue
  doc.text('CyberDefense Pro - Threat Report', 20, 30);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
  doc.text(`Total Threats: ${threats.length}`, 20, 55);
  
  // Threat severity summary
  const severityCounts = threats.reduce((acc, threat) => {
    acc[threat.severity] = (acc[threat.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let yPos = 70;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Severity Summary:', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  Object.entries(severityCounts).forEach(([severity, count]) => {
    doc.text(`${severity}: ${count}`, 25, yPos);
    yPos += 8;
  });
  
  // Threats table
  const tableData = threats.map(threat => [
    threat.timestamp,
    threat.type,
    threat.severity,
    threat.source,
    threat.target,
    threat.protocol,
    threat.port,
    threat.status,
    `${threat.confidence}%`
  ]);
  
  autoTable(doc, {
    head: [['Timestamp', 'Type', 'Severity', 'Source', 'Target', 'Protocol', 'Port/App', 'Status', 'Confidence']],
    body: tableData,
    startY: yPos + 10,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 123, 255] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportThreatsToCSV = (threats: ThreatData[], filename = 'threat-data') => {
  const csv = Papa.unparse(threats);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportNetworkDataToCSV = (data: NetworkData[], filename = 'network-traffic') => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportDatabaseBackup = async (tableName: string, data: any[], filename?: string) => {
  const backupData = {
    table: tableName,
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: data
  };
  
  const json = JSON.stringify(backupData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || tableName}-backup.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};