// src/components/utils/constants.js - Application constants and color scheme

// RJE Color Scheme
export const rjeColors = {
  lightGreen: '#B8D582',
  mediumGreen: '#7DB544',
  darkGreen: '#4A9B4B',
  teal: '#2E8B7A',
  blue: '#1E7FC2',
  darkBlue: '#0F5A8F'
};

// WBS Category Mapping
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

// Equipment categorization patterns
export const equipmentPatterns = {
  '02': ['+UH', 'UH'], // Protection Panels
  '03': ['+WA', 'WA'], // HV Switchboards
  '04': ['+WC', 'WC'], // LV Switchboards
  '05': ['T', 'NET', 'TA', 'NER'], // Transformers
  '06': ['+GB', 'GB', 'BAN'], // Battery Systems
  '07': ['E', 'EB', 'EEP', 'MEB'], // Earthing
  '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS'], // Building Services
  '10': ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K'] // Ancillary Systems
};

// File upload configuration
export const fileUploadConfig = {
  supportedFormats: ['.csv', '.xlsx', '.xls'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  requiredColumns: [
    'Subsystem',
    'Parent Equipment Number',
    'Equipment Number',
    'Description',
    'Commissioning (Y/N)'
  ]
};

// WBS structure configuration
export const wbsConfig = {
  rootWbsCode: '1',
  milestonesCode: '1.1',
  prerequisitesCode: '1.2',
  startingSubsystemCode: 3,
  orderedCategories: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99']
};

// Commissioning status values
export const commissioningStatus = {
  COMMISSIONED: 'Y',
  TBC: 'TBC',
  NOT_COMMISSIONED: 'N'
};

// Upload modes
export const uploadModes = {
  NEW_PROJECT: 'new',
  CONTINUE_PROJECT: 'continue',
  MISSING_EQUIPMENT: 'missing'
};

// Application version info
export const appVersion = {
  version: '2.0',
  architecture: 'v4.0',
  status: 'Production Ready'
};

// Error messages
export const errorMessages = {
  NO_VALID_EQUIPMENT: 'No valid equipment found. Please ensure your file contains the required columns: Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)',
  UNSUPPORTED_FORMAT: 'Unsupported file format. Please use .xlsx, .xls, or .csv files.',
  FILE_PROCESSING_ERROR: 'Error processing file. Please check the file format and required columns.',
  NO_WBS_STRUCTURE: 'Please load the existing WBS structure first',
  DEPLOYMENT_ERROR: 'Error during deployment. Please check the build logs.',
  MISSING_EQUIPMENT_NONE: 'No missing equipment found! All equipment from the uploaded list already exists in the current WBS structure.'
};

// Success messages
export const successMessages = {
  WBS_GENERATED: 'WBS structure generated successfully!',
  FILE_UPLOADED: 'File uploaded and processed successfully!',
  EQUIPMENT_PROCESSED: 'Equipment list processed successfully!',
  MISSING_EQUIPMENT_FOUND: 'Missing equipment identified and processed!',
  EXPORT_COMPLETE: 'Export completed successfully!'
};

// UI Configuration
export const uiConfig = {
  maxPreviewItems: 20,
  maxTreeHeight: '400px',
  defaultProjectName: 'Sample Project',
  loadingTimeout: 30000, // 30 seconds
  debounceDelay: 300 // 300ms
};

// CSV Export Configuration
export const csvConfig = {
  headers: ['wbs_code', 'parent_wbs_code', 'wbs_name'],
  separator: ',',
  encoding: 'utf-8',
  bom: true
};

// Validation patterns
export const validationPatterns = {
  equipmentNumber: /^[A-Z]+\d+/,
  wbsCode: /^\d+(\.\d+)*$/,
  subsystemCode: /^[A-Z]\d+\s*\|\s*/,
  projectCode: /^\d{4}/
};

// Default WBS structure elements
export const defaultWbsElements = {
  preparations: ['Test bay', 'Panel Shop', 'Pad'],
  interfaceTesting: ['Phase 1', 'Phase 2'],
  tbcSection: 'TBC - Equipment To Be Confirmed'
};

// Equipment validation rules
export const equipmentValidation = {
  invalidPatterns: [
    'EXAMPLE', 'Lot ', 'COMBI-', 'FREE ISSUE', 'Wall Internal', 
    '(Copy)', 'Test bay', 'Panel Shop', 'Pad', 'Phase 1', 'Phase 2',
    'Preparations and set-up', 'Protection Panels', 'HV Switchboards',
    'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing',
    'Building Services', 'Interface Testing', 'Ancillary Systems',
    'Unrecognised Equipment', 'Milestones', 'Pre-requisites'
  ],
  minLength: 2,
  maxLength: 50
};

// Performance configuration
export const performanceConfig = {
  maxEquipmentItems: 10000,
  maxWbsNodes: 50000,
  batchSize: 1000,
  processingTimeout: 60000 // 1 minute
};
// Add new constants for Continue Project functionality
export const xerFileConfig = {
  supportedFormats: ['.xer', '.csv', '.xlsx', '.xls'],
  maxFileSize: 50 * 1024 * 1024, // 50MB for large P6 exports
  projwbsFields: [
    'wbs_id', 'proj_id', 'wbs_short_name', 'wbs_name', 'parent_wbs_id'
  ]
};

export const integrationConfig = {
  maxSubsystems: 50,
  maxEquipmentPerCategory: 1000,
  validationTimeout: 30000, // 30 seconds
  codeGenerationStart: 100000 // Start new WBS IDs high to avoid conflicts
};

export const parentStructurePatterns = {
  prerequisites: /^P\s*\|\s*Pre-?[Rr]equisites?/i,
  milestones: /^M\s*\|\s*Milestones?/i,
  energisation: /^E\s*\|\s*Energisation?/i,
  subsystem: /^S(\d+)\s*\|\s*([+]?Z\d+)/i,
  tbcSection: /^TBC\s*[-|]\s*Equipment/i
};
