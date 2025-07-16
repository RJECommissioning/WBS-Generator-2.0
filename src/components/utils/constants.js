// src/utils/constants.js

export const rjeColors = {
  lightGreen: '#B8D582',
  mediumGreen: '#7DB544',
  darkGreen: '#4A9B4B',
  teal: '#2E8B7A',
  blue: '#1E7FC2',
  darkBlue: '#0F5A8F'
};

export const categoryMapping = {
  '01': 'Preparations and set-up',
  '02': 'Protection Panels',
  '03': 'HV Switchboards',
  '04': 'LV Switchboards',
  '05': 'Transformers',
  '06': 'Battery Systems',
  '07': 'Earthing',
  '08': 'Building Services',
  '09': 'Interface Testing',
  '10': 'Ancillary Systems',
  '99': 'Unrecognised Equipment'
};

export const orderedCategoryKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];

export const equipmentPatterns = {
  '01': [], // Handled separately - Test bay, Panel Shop, Pad
  '02': ['+UH', 'UH'],
  '03': ['+WA', 'WA'],
  '04': ['+WC', 'WC'],
  '05': ['T', 'NET', 'TA', 'NER'],
  '06': ['+GB', 'GB', 'BAN'],
  '07': ['E', 'EB', 'EEP', 'MEB'],
  '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS'],
  '09': ['Interface', 'Testing'],
  '10': ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K']
};

export const allOtherPatterns = [
  '+UH', 'UH', '+WA', 'WA', '+WC', 'WC', 'T', 'NET', 'TA', 'NER',
  '+GB', 'GB', 'BAN', 'E', 'EB', 'EEP', 'MEB', '+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS',
  'Interface', 'Testing', '+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K'
];

export const invalidEquipmentPatterns = [
  'EXAMPLE', 'Lot ', 'COMBI-', 'FREE ISSUE', 'Wall Internal', 
  '(Copy)', 'Test bay', 'Panel Shop', 'Pad', 'Phase 1', 'Phase 2',
  'Preparations and set-up', 'Protection Panels', 'HV Switchboards',
  'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing',
  'Building Services', 'Interface Testing', 'Ancillary Systems',
  'Unrecognised Equipment', 'Milestones', 'Pre-requisites'
];

export const standardWBSCategories = [
  'Preparations and set-up', 'Protection Panels', 'HV Switchboards', 
  'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing', 
  'Building Services', 'Interface Testing', 'Ancillary Systems', 
  'Unrecognised Equipment', 'Milestones', 'Pre-requisites', 
  'Phase 1', 'Phase 2', 'Test bay', 'Panel Shop', 'Pad'
];

export const wbsStructurePatterns = [
  /^\d{2}\s*\|\s*/, // 01 | Preparations, 02 | Protection, etc.
  /^M\s*\|\s*/, // M | Milestones
  /^P\s*\|\s*/, // P | Pre-requisites
  /^S\d+\s*\|\s*/, // S1 | Subsystem, S2 | Subsystem, etc.
  /^TBC\s*-\s*/, // TBC - Equipment To Be Confirmed
  /^\d{4}.*/ // Project codes like 5737
];

export const columnMapping = {
  'Subsystem': 'subsystem',
  'Parent Equipment Number': 'parentEquipmentNumber',
  'Equipment Number': 'equipmentNumber',
  'Description': 'description',
  'Commissioning (Y/N)': 'commissioning',
  'Project': 'project',
  'Item No.': 'itemNo',
  'PLU': 'plu',
  'Supplier': 'supplier',
  'Manufacturer': 'manufacturer',
  'Model Number': 'modelNumber',
  'Test Code': 'testCode',
  'Comments': 'comments',
  'Drawings': 'drawings'
};
