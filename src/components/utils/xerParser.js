// src/components/utils/xerParser.js - FIXED XER Parser with Enhanced Hierarchy Building

/**
 * FIXED XER File Processing Engine for Primavera P6 Integration
 * Addresses hierarchy building issues and parent structure recognition problems
 */

// ============================================================================
// ENHANCED XER FILE PROCESSING ENGINE
// ============================================================================

/**
 * Enhanced XER Parser Class with Fixed Hierarchy Building
 */
export class XERParser {
  constructor() {
    this.projwbsTable = [];
    this.wbsHierarchy = new Map();
    this.parentStructures = new Map();
    this.projectInfo = null;
    this.debugMode = true; // Enable for troubleshooting
  }

  /**
   * Parse XER file with enhanced error handling and debugging
   */
  async parseXERFile(file) {
    console.log(`🔧 FIXED XER Parser: Processing file "${file.name}"`);
    
    try {
      // 1. Read file content
      const content = await this.readFile(file);
      console.log(`📄 File content length: ${content.length} characters`);
      
      // 2. Determine file format with better detection
      const isXER = this.detectXERFormat(content);
      console.log(`📋 File format detected: ${isXER ? 'XER' : 'CSV'}`);
      
      let projwbsData;
      if (isXER) {
        // 3a. Extract PROJWBS table from XER format
        projwbsData = this.extractPROJWBSFromXER(content);
      } else {
        // 3b. Process as CSV format
        projwbsData = await this.extractPROJWBSFromCSV(content);
      }
      
      console.log(`📊 Raw PROJWBS records extracted: ${projwbsData.length}`);
      
      if (projwbsData.length === 0) {
        throw new Error('No PROJWBS data found in file. Please ensure this is a valid P6 export.');
      }
      
      // 4. Filter for target project with improved logic
      const projectId = this.autoDetectProjectId(projwbsData);
      const projectWBS = this.filterByProject(projwbsData, projectId);
      
      console.log(`🎯 Project ${projectId}: Found ${projectWBS.length} WBS elements`);
      
      // 5. FIXED: Build hierarchy map with enhanced logic
      this.buildHierarchyMapFixed(projectWBS);
      
      // 6. FIXED: Identify parent structures with better patterns
      const parentStructures = this.identifyParentStructuresFixed(projectWBS);
      
      // 7. Extract project information
      this.projectInfo = this.extractProjectInfo(projectWBS);
      
      // 8. Validation and debugging
      this.validateResults(projectWBS, parentStructures);
      
      return {
        wbsElements: projectWBS,
        hierarchy: this.wbsHierarchy,
        parentStructures: parentStructures,
        projectInfo: this.projectInfo,
        totalElements: projectWBS.length
      };
      
    } catch (error) {
      console.error('🚫 FIXED XER Parser Error:', error);
      throw new Error(`Failed to parse XER file: ${error.message}`);
    }
  }

  /**
   * Enhanced file format detection
   */
  detectXERFormat(content) {
    // Check for XER format indicators
    const xerIndicators = ['%T\tPROJWBS', '%F\t', '%R\t'];
    const hasXERIndicators = xerIndicators.some(indicator => content.includes(indicator));
    
    // Check for CSV format indicators
    const lines = content.split('\n').slice(0, 5);
    const hasCSVHeaders = lines.some(line => 
      line.includes('wbs_id') || 
      line.includes('wbs_name') || 
      line.includes('parent_wbs_id')
    );
    
    console.log(`🔍 Format detection - XER indicators: ${hasXERIndicators}, CSV headers: ${hasCSVHeaders}`);
    
    return hasXERIndicators && !hasCSVHeaders;
  }

  /**
   * Read file content
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
   * FIXED: Extract PROJWBS table from XER format with better parsing
   */
  extractPROJWBSFromXER(content) {
    console.log('🔍 FIXED: Extracting PROJWBS table from XER format');
    
    const lines = content.split('\n');
    const projwbsData = [];
    let inProjwbsSection = false;
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Find PROJWBS table start
      if (line === '%T\tPROJWBS') {
        inProjwbsSection = true;
        console.log(`📍 Found PROJWBS table at line ${i + 1}`);
        continue;
      }
      
      // Get headers
      if (inProjwbsSection && line.startsWith('%F\t')) {
        headers = line.substring(3).split('\t');
        console.log(`📋 PROJWBS headers: ${headers.join(', ')}`);
        continue;
      }
      
      // Process data rows
      if (inProjwbsSection && line.startsWith('%R\t')) {
        const values = line.substring(3).split('\t');
        const record = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index] || null;
        });
        
        // Ensure we have essential fields
        if (record.wbs_id && record.wbs_name) {
          projwbsData.push(record);
        }
        continue;
      }
      
      // Stop when reaching next table
      if (inProjwbsSection && line.startsWith('%T\t') && line !== '%T\tPROJWBS') {
        console.log(`📍 End of PROJWBS table at line ${i + 1}`);
        break;
      }
    }
    
    console.log(`✅ FIXED: Extracted ${projwbsData.length} PROJWBS records`);
    return projwbsData;
  }

  /**
   * FIXED: Extract PROJWBS data from CSV format with better handling
   */
  async extractPROJWBSFromCSV(content) {
    console.log('🔍 FIXED: Processing CSV format');
    
    const Papa = await import('papaparse');
    const delimiter = this.detectCSVDelimiter(content);
    console.log(`📊 CSV delimiter detected: "${delimiter}"`);
    
    const parsed = Papa.default.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: delimiter
    });
    
    if (parsed.errors.length > 0) {
      console.warn('⚠️ CSV parsing warnings:', parsed.errors);
    }
    
    // Filter for valid WBS records
    const validRecords = parsed.data.filter(record => 
      record.wbs_id && record.wbs_name
    );
    
    console.log(`✅ FIXED: Extracted ${validRecords.length} valid CSV records`);
    return validRecords;
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
   * Auto-detect project ID
   */
  autoDetectProjectId(projwbsData) {
    if (projwbsData.length === 0) return null;
    
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
    
    console.log(`🎯 FIXED: Auto-detected project ID: ${mainProjectId} (${projectCounts[mainProjectId]} elements)`);
    return mainProjectId;
  }

  /**
   * Filter WBS elements by project ID
   */
  filterByProject(projwbsData, projectId) {
    return projwbsData.filter(record => 
      !projectId || record.proj_id?.toString() === projectId?.toString()
    );
  }

  /**
   * FIXED: Build hierarchy map with enhanced parent-child relationship logic
   */
  buildHierarchyMapFixed(projectWBS) {
    console.log('🏗️ FIXED: Building WBS hierarchy map with enhanced logic');
    
    this.wbsHierarchy.clear();
    
    // Create a lookup map for faster parent finding
    const wbsLookup = new Map();
    projectWBS.forEach(element => {
      wbsLookup.set(element.wbs_id, element);
    });
    
    console.log(`📊 Created lookup map with ${wbsLookup.size} elements`);
    
    // Build hierarchy relationships
    let rootNodes = 0;
    let orphanedNodes = 0;
    
    projectWBS.forEach(element => {
      const parentId = element.parent_wbs_id;
      
      if (!parentId || parentId === '' || parentId === element.wbs_id) {
        // This is a root node
        if (!this.wbsHierarchy.has(null)) {
          this.wbsHierarchy.set(null, []);
        }
        this.wbsHierarchy.get(null).push(element);
        rootNodes++;
      } else {
        // This has a parent
        const parentExists = wbsLookup.has(parentId);
        
        if (parentExists) {
          // Valid parent-child relationship
          if (!this.wbsHierarchy.has(parentId)) {
            this.wbsHierarchy.set(parentId, []);
          }
          this.wbsHierarchy.get(parentId).push(element);
        } else {
          // Orphaned node - parent not found
          if (this.debugMode) {
            console.warn(`⚠️ FIXED: Orphaned node ${element.wbs_id} (parent ${parentId} not found)`);
          }
          orphanedNodes++;
          
          // Add to root level as fallback
          if (!this.wbsHierarchy.has(null)) {
            this.wbsHierarchy.set(null, []);
          }
          this.wbsHierarchy.get(null).push(element);
        }
      }
    });
    
    console.log(`✅ FIXED: Hierarchy built successfully`);
    console.log(`   📊 Root nodes: ${rootNodes}`);
    console.log(`   📊 Orphaned nodes: ${orphanedNodes}`);
    console.log(`   📊 Parent groups: ${this.wbsHierarchy.size}`);
    
    // Additional debugging
    if (this.debugMode && rootNodes > 10) {
      console.warn(`⚠️ FIXED: Unusually high number of root nodes (${rootNodes}). This may indicate hierarchy parsing issues.`);
    }
  }

  /**
   * FIXED: Identify parent structures with enhanced pattern matching
   */
  identifyParentStructuresFixed(wbsElements) {
    console.log('🔍 FIXED: Analyzing WBS patterns with enhanced recognition');
    
    const patterns = {
      prerequisites: [
        /^P\s*\|\s*Pre-?[Rr]equisites?/i,
        /^Pre-?[Rr]equisites?/i,
        /^P\s+Pre-?[Rr]equisites?/i
      ],
      milestones: [
        /^M\s*\|\s*Milestones?/i,
        /^Milestones?/i,
        /^M\s+Milestones?/i
      ],
      energisation: [
        /^E\s*\|\s*Energisation?/i,
        /^Energisation?/i,
        /^E\s+Energisation?/i
      ],
      subsystem: [
        /^S(\d+)\s*\|\s*([+]?Z\d+)/i,
        /^S(\d+)\s+([+]?Z\d+)/i,
        /^S(\d+)\s*[-|]\s*([+]?Z\d+)/i
      ],
      tbcSection: [
        /^TBC\s*[-|]\s*Equipment/i,
        /^TBC.*Equipment/i,
        /Equipment.*TBC/i
      ]
    };

    const parentStructures = {
      prerequisites: null,
      milestones: null,
      energisation: null,
      subsystems: [],
      tbcSection: null,
      root: null
    };

    // Find root element
    const rootElements = wbsElements.filter(el => !el.parent_wbs_id || el.parent_wbs_id === '');
    if (rootElements.length > 0) {
      parentStructures.root = rootElements[0]; // Take the first root
      console.log(`🏠 FIXED: Found root element: "${rootElements[0].wbs_name}"`);
      
      if (rootElements.length > 1) {
        console.warn(`⚠️ FIXED: Multiple root elements found (${rootElements.length}). Using: "${rootElements[0].wbs_name}"`);
      }
    }

    // Analyze each element for parent patterns
    let matchCount = 0;
    wbsElements.forEach(element => {
      const name = element.wbs_name || '';
      
      // Check Prerequisites patterns
      if (!parentStructures.prerequisites) {
        for (const pattern of patterns.prerequisites) {
          if (pattern.test(name)) {
            parentStructures.prerequisites = element;
            console.log(`📋 FIXED: Found Prerequisites: "${name}" (ID: ${element.wbs_id})`);
            matchCount++;
            break;
          }
        }
      }
      
      // Check Milestones patterns
      if (!parentStructures.milestones) {
        for (const pattern of patterns.milestones) {
          if (pattern.test(name)) {
            parentStructures.milestones = element;
            console.log(`🎯 FIXED: Found Milestones: "${name}" (ID: ${element.wbs_id})`);
            matchCount++;
            break;
          }
        }
      }
      
      // Check Energisation patterns
      if (!parentStructures.energisation) {
        for (const pattern of patterns.energisation) {
          if (pattern.test(name)) {
            parentStructures.energisation = element;
            console.log(`⚡ FIXED: Found Energisation: "${name}" (ID: ${element.wbs_id})`);
            matchCount++;
            break;
          }
        }
      }
      
      // Check Subsystem patterns
      for (const pattern of patterns.subsystem) {
        const match = name.match(pattern);
        if (match) {
          const subsystemInfo = {
            element: element,
            subsystemNumber: parseInt(match[1]),
            zoneCode: match[2],
            fullName: name
          };
          parentStructures.subsystems.push(subsystemInfo);
          console.log(`🏢 FIXED: Found Subsystem S${subsystemInfo.subsystemNumber}: "${name}" (Zone: ${subsystemInfo.zoneCode})`);
          matchCount++;
          break;
        }
      }
      
      // Check TBC section patterns
      if (!parentStructures.tbcSection) {
        for (const pattern of patterns.tbcSection) {
          if (pattern.test(name)) {
            parentStructures.tbcSection = element;
            console.log(`⏳ FIXED: Found TBC Section: "${name}" (ID: ${element.wbs_id})`);
            matchCount++;
            break;
          }
        }
      }
    });

    // Sort subsystems by number
    parentStructures.subsystems.sort((a, b) => a.subsystemNumber - b.subsystemNumber);

    console.log(`✅ FIXED: Parent Structure Analysis Complete (${matchCount} matches found):`);
    console.log(`   Prerequisites: ${parentStructures.prerequisites ? '✅' : '❌'}`);
    console.log(`   Milestones: ${parentStructures.milestones ? '✅' : '❌'}`);
    console.log(`   Energisation: ${parentStructures.energisation ? '✅' : '❌'}`);
    console.log(`   Subsystems: ${parentStructures.subsystems.length} found`);
    console.log(`   TBC Section: ${parentStructures.tbcSection ? '✅' : '❌'}`);

    // Warning if no patterns found
    if (matchCount === 0) {
      console.warn('⚠️ FIXED: No standard parent structure patterns found!');
      console.warn('📝 Sample WBS names for debugging:');
      wbsElements.slice(0, 10).forEach(el => {
        console.warn(`   - "${el.wbs_name}" (ID: ${el.wbs_id})`);
      });
    }

    return parentStructures;
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

  /**
   * Validate results and provide debugging information
   */
  validateResults(projectWBS, parentStructures) {
    console.log('🔍 FIXED: Validating parsing results...');
    
    const validation = {
      hasRootElement: !!this.projectInfo.rootWbsId,
      hasHierarchy: this.wbsHierarchy.size > 0,
      hasParentStructures: Object.values(parentStructures).some(v => v !== null && (!Array.isArray(v) || v.length > 0)),
      totalElements: projectWBS.length
    };
    
    console.log('📊 FIXED: Validation Results:');
    console.log(`   Root Element: ${validation.hasRootElement ? '✅' : '❌'}`);
    console.log(`   Hierarchy Built: ${validation.hasHierarchy ? '✅' : '❌'}`);
    console.log(`   Parent Structures: ${validation.hasParentStructures ? '✅' : '❌'}`);
    console.log(`   Total Elements: ${validation.totalElements}`);
    
    if (!validation.hasParentStructures) {
      console.warn('⚠️ FIXED: No parent structures detected. This may indicate:');
      console.warn('   1. Non-standard WBS naming conventions');
      console.warn('   2. File format issues');
      console.warn('   3. Missing required WBS sections');
    }
    
    return validation;
  }
}

// ============================================================================
// ENHANCED PARENT STRUCTURE MANAGER
// ============================================================================

/**
 * Enhanced Parent Structure Manager with better pattern recognition
 */
export class ParentStructureManager {
  constructor() {
    // Enhanced patterns with more variations
    this.patterns = {
      prerequisites: [
        /^P\s*\|\s*Pre-?[Rr]equisites?/i,
        /^Pre-?[Rr]equisites?/i,
        /^P\s+Pre-?[Rr]equisites?/i,
        /Prerequisites/i
      ],
      milestones: [
        /^M\s*\|\s*Milestones?/i,
        /^Milestones?/i,
        /^M\s+Milestones?/i
      ],
      energisation: [
        /^E\s*\|\s*Energisation?/i,
        /^Energisation?/i,
        /^E\s+Energisation?/i
      ],
      subsystem: [
        /^S(\d+)\s*\|\s*([+]?Z\d+)/i,
        /^S(\d+)\s+([+]?Z\d+)/i,
        /^S(\d+)\s*[-|]\s*([+]?Z\d+)/i
      ],
      tbcSection: [
        /^TBC\s*[-|]\s*Equipment/i,
        /^TBC.*Equipment/i,
        /Equipment.*TBC/i
      ]
    };
  }

  /**
   * Enhanced parent structure identification
   */
  identifyParentStructures(wbsElements) {
    console.log('🔍 Enhanced Parent Structure Manager: Analyzing patterns');
    return new XERParser().identifyParentStructuresFixed(wbsElements);
  }

  /**
   * Find next available subsystem number
   */
  findNextSubsystemNumber(existingSubsystems) {
    if (existingSubsystems.length === 0) return 1;
    
    const numbers = existingSubsystems.map(s => s.subsystemNumber);
    const nextNumber = Math.max(...numbers) + 1;
    
    console.log(`🔢 FIXED: Next subsystem number: S${nextNumber}`);
    return nextNumber;
  }

  /**
   * Extract zone code from subsystem name
   */
  extractZoneCode(subsystemName) {
    const zonePatterns = [
      /([+]?Z\d+)/i,
      /Zone\s*(\d+)/i,
      /Area\s*(\d+)/i
    ];

    for (const pattern of zonePatterns) {
      const match = subsystemName.match(pattern);
      if (match) {
        let zoneCode = match[1];
        if (!zoneCode.startsWith('+') && zoneCode.startsWith('Z')) {
          zoneCode = '+' + zoneCode;
        }
        console.log(`🔍 FIXED: Extracted zone code: "${zoneCode}" from "${subsystemName}"`);
        return zoneCode;
      }
    }

    const numMatch = subsystemName.match(/(\d+)/);
    if (numMatch) {
      const zoneCode = `+Z${numMatch[1].padStart(2, '0')}`;
      console.log(`🔍 FIXED: Generated zone code: "${zoneCode}" from "${subsystemName}"`);
      return zoneCode;
    }

    console.log(`⚠️ FIXED: Could not extract zone code from: "${subsystemName}"`);
    return '+Z??';
  }

  /**
   * Enhanced validation with detailed feedback
   */
  validateParentStructures(parentStructures) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: []
    };

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

    console.log(`🔍 FIXED: Parent Structure Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Warnings: ${validation.warnings.length}`);
    console.log(`   Errors: ${validation.errors.length}`);

    return validation;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new enhanced XER Parser instance
 */
export const createXERParser = () => {
  return new XERParser();
};

/**
 * Create a new enhanced Parent Structure Manager instance
 */
export const createParentStructureManager = () => {
  return new ParentStructureManager();
};

/**
 * FIXED: Quick function to process XER file with enhanced error handling
 */
export const analyzeXERFile = async (file) => {
  const parser = new XERParser();
  const structureManager = new ParentStructureManager();
  
  console.log('🚀 FIXED: Starting comprehensive XER file analysis with enhanced parsing');
  
  try {
    // Parse the file
    const parseResults = await parser.parseXERFile(file);
    
    // Identify parent structures (already done in parseXERFile)
    const parentStructures = parseResults.parentStructures;
    
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
    
    console.log('✅ FIXED: XER file analysis complete with enhanced processing');
    console.log(`📊 Summary: ${analysis.summary.totalElements} elements, ${analysis.summary.subsystemCount} subsystems`);
    
    return analysis;
    
  } catch (error) {
    console.error('🚫 FIXED: XER Analysis failed:', error);
    throw error;
  }
};
