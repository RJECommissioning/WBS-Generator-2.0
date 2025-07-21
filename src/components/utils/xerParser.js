// src/components/utils/xerParser.js - XER File Processing & Parent Structure Recognition

/**
 * XER File Processing Engine for Primavera P6 Integration
 * Handles parsing, parent structure recognition, and WBS hierarchy analysis
 */

// ============================================================================
// XER FILE PROCESSING ENGINE
// ============================================================================

/**
 * Main XER Parser Class - Processes P6 XER files and extracts WBS structures
 */
export class XERParser {
  constructor() {
    this.projwbsTable = [];
    this.wbsHierarchy = new Map();
    this.parentStructures = new Map();
    this.projectInfo = null;
  }

  /**
   * Parse XER file and extract all relevant data
   * @param {File} file - XER or CSV file from P6 export
   * @returns {Object} - Parsed WBS structure with hierarchy and parent patterns
   */
  async parseXERFile(file) {
    console.log(`🔧 XER Parser: Processing file "${file.name}"`);
    
    try {
      // 1. Read file content
      const content = await this.readFile(file);
      
      // 2. Determine if XER or CSV format
      const isXER = file.name.toLowerCase().endsWith('.xer') || content.includes('%T\tPROJWBS');
      
      let projwbsData;
      if (isXER) {
        // 3a. Extract PROJWBS table from XER format
        projwbsData = this.extractPROJWBSFromXER(content);
      } else {
        // 3b. Process as CSV format
        projwbsData = await this.extractPROJWBSFromCSV(content);
      }
      
      // 4. Filter for target project (auto-detect or use first project)
      const projectId = this.autoDetectProjectId(projwbsData);
      const projectWBS = this.filterByProject(projwbsData, projectId);
      
      console.log(`📊 XER Parser: Found ${projectWBS.length} WBS elements for project ${projectId}`);
      
      // 5. Build hierarchy map
      this.buildHierarchyMap(projectWBS);
      
      // 6. Identify parent structures
      const parentStructures = this.identifyParentStructures(projectWBS);
      
      // 7. Extract project information
      this.projectInfo = this.extractProjectInfo(projectWBS);
      
      return {
        wbsElements: projectWBS,
        hierarchy: this.wbsHierarchy,
        parentStructures: parentStructures,
        projectInfo: this.projectInfo,
        totalElements: projectWBS.length
      };
      
    } catch (error) {
      console.error('🚫 XER Parser Error:', error);
      throw new Error(`Failed to parse XER file: ${error.message}`);
    }
  }

  /**
   * Read file content based on type
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Extract PROJWBS table from XER format
   * Handles the specific P6 XER table structure
   */
  extractPROJWBSFromXER(content) {
    console.log('🔍 XER Parser: Extracting PROJWBS table from XER format');
    
    const lines = content.split('\n');
    const projwbsData = [];
    let inProjwbsSection = false;
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Find PROJWBS table start
      if (line === '%T\tPROJWBS') {
        inProjwbsSection = true;
        continue;
      }
      
      // Get headers
      if (inProjwbsSection && line.startsWith('%F\t')) {
        headers = line.substring(3).split('\t');
        continue;
      }
      
      // Process data rows
      if (inProjwbsSection && line.startsWith('%R\t')) {
        const values = line.substring(3).split('\t');
        const record = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index] || null;
        });
        
        projwbsData.push(record);
        continue;
      }
      
      // Stop when reaching next table
      if (inProjwbsSection && line.startsWith('%T\t') && line !== '%T\tPROJWBS') {
        break;
      }
    }
    
    console.log(`✅ XER Parser: Extracted ${projwbsData.length} PROJWBS records`);
    return projwbsData;
  }

  /**
   * Extract PROJWBS data from CSV format
   * Handles standard CSV exports from P6
   */
  async extractPROJWBSFromCSV(content) {
    console.log('🔍 XER Parser: Processing CSV format');
    
    const Papa = await import('papaparse');
    const parsed = Papa.default.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: this.detectCSVDelimiter(content)
    });
    
    console.log(`✅ XER Parser: Extracted ${parsed.data.length} CSV records`);
    return parsed.data;
  }

  /**
   * Detect CSV delimiter
   */
  detectCSVDelimiter(content) {
    const firstLine = content.split('\n')[0];
    if (firstLine.includes('\t')) return '\t';
    if (firstLine.includes(';')) return ';';
    return ',';
  }

  /**
   * Auto-detect project ID from data
   */
  autoDetectProjectId(projwbsData) {
    if (projwbsData.length === 0) return null;
    
    // Find the most common proj_id
    const projectCounts = {};
    projwbsData.forEach(record => {
      const projId = record.proj_id;
      if (projId) {
        projectCounts[projId] = (projectCounts[projId] || 0) + 1;
      }
    });
    
    const mainProjectId = Object.keys(projectCounts).reduce((a, b) => 
      projectCounts[a] > projectCounts[b] ? a : b
    );
    
    console.log(`🎯 XER Parser: Auto-detected project ID: ${mainProjectId}`);
    return mainProjectId;
  }

  /**
   * Filter WBS elements by project ID
   */
  filterByProject(projwbsData, projectId) {
    return projwbsData.filter(record => 
      record.proj_id?.toString() === projectId?.toString()
    );
  }

  /**
   * Build hierarchy map for efficient parent-child lookups
   */
  buildHierarchyMap(projectWBS) {
    console.log('🏗️ XER Parser: Building WBS hierarchy map');
    
    this.wbsHierarchy.clear();
    
    projectWBS.forEach(element => {
      const wbsId = element.wbs_id;
      const parentId = element.parent_wbs_id;
      
      if (!this.wbsHierarchy.has(parentId)) {
        this.wbsHierarchy.set(parentId, []);
      }
      this.wbsHierarchy.get(parentId).push(element);
    });
    
    console.log(`✅ XER Parser: Built hierarchy with ${this.wbsHierarchy.size} parent nodes`);
  }

  /**
   * Extract basic project information
   */
  extractProjectInfo(projectWBS) {
    const rootElement = projectWBS.find(el => !el.parent_wbs_id || el.parent_wbs_id === '');
    
    return {
      projectName: rootElement?.wbs_name || 'Unknown Project',
      projectCode: rootElement?.wbs_short_name || '',
      rootWbsId: rootElement?.wbs_id || null,
      totalElements: projectWBS.length
    };
  }
}

// ============================================================================
// PARENT STRUCTURE RECOGNITION SYSTEM
// ============================================================================

/**
 * Smart Parent Structure Manager - Identifies and manages P6 parent patterns
 */
export class ParentStructureManager {
  constructor() {
    this.patterns = {
      prerequisites: /^P\s*\|\s*Pre-?[Rr]equisites?/i,
      milestones: /^M\s*\|\s*Milestones?/i,
      energisation: /^E\s*\|\s*Energisation?/i,
      subsystem: /^S(\d+)\s*\|\s*([+]?Z\d+)/i,
      tbcSection: /^TBC\s*[-|]\s*Equipment/i
    };
  }

  /**
   * Identify all key parent structures in the WBS
   * @param {Array} wbsElements - All WBS elements from the project
   * @returns {Object} - Categorized parent structures
   */
  identifyParentStructures(wbsElements) {
    console.log('🔍 Parent Structure Manager: Analyzing WBS patterns');
    
    const parentStructures = {
      prerequisites: null,
      milestones: null,
      energisation: null,
      subsystems: [],
      tbcSection: null,
      root: null
    };

    // Find root element
    const rootElement = wbsElements.find(el => !el.parent_wbs_id || el.parent_wbs_id === '');
    if (rootElement) {
      parentStructures.root = rootElement;
      console.log(`🏠 Found root element: "${rootElement.wbs_name}"`);
    }

    // Analyze each element for parent patterns
    wbsElements.forEach(element => {
      const name = element.wbs_name || '';
      
      // Check for Prerequisites pattern
      if (this.patterns.prerequisites.test(name)) {
        parentStructures.prerequisites = element;
        console.log(`📋 Found Prerequisites: "${name}" (ID: ${element.wbs_id})`);
      }
      
      // Check for Milestones pattern
      else if (this.patterns.milestones.test(name)) {
        parentStructures.milestones = element;
        console.log(`🎯 Found Milestones: "${name}" (ID: ${element.wbs_id})`);
      }
      
      // Check for Energisation pattern
      else if (this.patterns.energisation.test(name)) {
        parentStructures.energisation = element;
        console.log(`⚡ Found Energisation: "${name}" (ID: ${element.wbs_id})`);
      }
      
      // Check for Subsystem pattern (S1, S2, S3...)
      else if (this.patterns.subsystem.test(name)) {
        const match = name.match(this.patterns.subsystem);
        const subsystemInfo = {
          element: element,
          subsystemNumber: parseInt(match[1]),
          zoneCode: match[2],
          fullName: name
        };
        parentStructures.subsystems.push(subsystemInfo);
        console.log(`🏢 Found Subsystem S${subsystemInfo.subsystemNumber}: "${name}" (Zone: ${subsystemInfo.zoneCode})`);
      }
      
      // Check for TBC section
      else if (this.patterns.tbcSection.test(name)) {
        parentStructures.tbcSection = element;
        console.log(`⏳ Found TBC Section: "${name}" (ID: ${element.wbs_id})`);
      }
    });

    // Sort subsystems by number
    parentStructures.subsystems.sort((a, b) => a.subsystemNumber - b.subsystemNumber);

    console.log(`✅ Parent Structure Analysis Complete:`);
    console.log(`   Prerequisites: ${parentStructures.prerequisites ? '✅' : '❌'}`);
    console.log(`   Milestones: ${parentStructures.milestones ? '✅' : '❌'}`);
    console.log(`   Energisation: ${parentStructures.energisation ? '✅' : '❌'}`);
    console.log(`   Subsystems: ${parentStructures.subsystems.length} found`);
    console.log(`   TBC Section: ${parentStructures.tbcSection ? '✅' : '❌'}`);

    return parentStructures;
  }

  /**
   * Find the next available subsystem number
   * @param {Array} existingSubsystems - Array of existing subsystem info
   * @returns {number} - Next available subsystem number
   */
  findNextSubsystemNumber(existingSubsystems) {
    if (existingSubsystems.length === 0) return 1;
    
    const numbers = existingSubsystems.map(s => s.subsystemNumber);
    const nextNumber = Math.max(...numbers) + 1;
    
    console.log(`🔢 Next subsystem number: S${nextNumber}`);
    return nextNumber;
  }

  /**
   * Extract zone code from subsystem name
   * @param {string} subsystemName - Full subsystem name
   * @returns {string} - Extracted zone code (e.g., "+Z02")
   */
  extractZoneCode(subsystemName) {
    // Look for patterns like "+Z01", "Z02", "+Z001"
    const zonePatterns = [
      /([+]?Z\d+)/i,
      /Zone\s*(\d+)/i,
      /Area\s*(\d+)/i
    ];

    for (const pattern of zonePatterns) {
      const match = subsystemName.match(pattern);
      if (match) {
        let zoneCode = match[1];
        // Ensure proper format with + prefix
        if (!zoneCode.startsWith('+') && zoneCode.startsWith('Z')) {
          zoneCode = '+' + zoneCode;
        }
        console.log(`🔍 Extracted zone code: "${zoneCode}" from "${subsystemName}"`);
        return zoneCode;
      }
    }

    // Default: extract any numeric pattern and format as zone
    const numMatch = subsystemName.match(/(\d+)/);
    if (numMatch) {
      const zoneCode = `+Z${numMatch[1].padStart(2, '0')}`;
      console.log(`🔍 Generated zone code: "${zoneCode}" from "${subsystemName}"`);
      return zoneCode;
    }

    console.log(`⚠️ Could not extract zone code from: "${subsystemName}"`);
    return '+Z??';
  }

  /**
   * Validate parent structure completeness
   * @param {Object} parentStructures - Identified parent structures
   * @returns {Object} - Validation results with warnings/errors
   */
  validateParentStructures(parentStructures) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: []
    };

    // Check for missing critical structures
    if (!parentStructures.prerequisites) {
      validation.warnings.push('No "P | Pre-Requisites" section found');
      validation.recommendations.push('Consider adding Prerequisites section for proper subsystem dependencies');
    }

    if (!parentStructures.milestones) {
      validation.warnings.push('No "M | Milestones" section found');
      validation.recommendations.push('Milestones section recommended for project tracking');
    }

    if (parentStructures.subsystems.length === 0) {
      validation.errors.push('No existing subsystems found (S1, S2, etc.)');
      validation.isValid = false;
    }

    // Check subsystem numbering consistency
    const expectedNumbers = Array.from({length: parentStructures.subsystems.length}, (_, i) => i + 1);
    const actualNumbers = parentStructures.subsystems.map(s => s.subsystemNumber).sort((a, b) => a - b);
    
    if (JSON.stringify(expectedNumbers) !== JSON.stringify(actualNumbers)) {
      validation.warnings.push('Subsystem numbering has gaps or inconsistencies');
    }

    console.log(`🔍 Parent Structure Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Warnings: ${validation.warnings.length}`);
    console.log(`   Errors: ${validation.errors.length}`);

    return validation;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new XER Parser instance
 * @returns {XERParser} - New parser instance
 */
export const createXERParser = () => {
  return new XERParser();
};

/**
 * Create a new Parent Structure Manager instance
 * @returns {ParentStructureManager} - New manager instance
 */
export const createParentStructureManager = () => {
  return new ParentStructureManager();
};

/**
 * Quick function to process XER file and identify parent structures
 * @param {File} file - XER or CSV file
 * @returns {Object} - Complete analysis results
 */
export const analyzeXERFile = async (file) => {
  const parser = new XERParser();
  const structureManager = new ParentStructureManager();
  
  console.log('🚀 Starting comprehensive XER file analysis');
  
  // Parse the file
  const parseResults = await parser.parseXERFile(file);
  
  // Identify parent structures
  const parentStructures = structureManager.identifyParentStructures(parseResults.wbsElements);
  
  // Validate structures
  const validation = structureManager.validateParentStructures(parentStructures);
  
  const analysis = {
    ...parseResults,
    parentStructures,
    validation,
    summary: {
      projectName: parseResults.projectInfo.projectName,
      totalElements: parseResults.totalElements,
      subsystemCount: parentStructures.subsystems.length,
      nextSubsystemNumber: structureManager.findNextSubsystemNumber(parentStructures.subsystems),
      hasPrerequisites: !!parentStructures.prerequisites,
      hasMilestones: !!parentStructures.milestones,
      validationPassed: validation.isValid
    }
  };
  
  console.log('✅ XER file analysis complete');
  console.log(`📊 Summary: ${analysis.summary.totalElements} elements, ${analysis.summary.subsystemCount} subsystems`);
  
  return analysis;
};
