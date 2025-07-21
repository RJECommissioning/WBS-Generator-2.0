// src/components/utils/xerParser.js - Clean XER Parser (JavaScript Only)

/**
 * XER File Processing Engine for Primavera P6 Integration
 * JavaScript utility functions only - NO JSX/React components
 */

// ============================================================================
// XER FILE PROCESSING ENGINE
// ============================================================================

/**
 * Enhanced XER Parser Class
 */
export class XERParser {
  constructor() {
    this.projwbsTable = [];
    this.wbsHierarchy = new Map();
    this.parentStructures = new Map();
    this.projectInfo = null;
    this.debugMode = true;
  }

  /**
   * Parse XER file with enhanced error handling and debugging
   */
  async parseXERFile(file) {
    console.log(`🔧 XER Parser: Processing file "${file.name}"`);
    
    try {
      // 1. Read file content
      const content = await this.readFile(file);
      console.log(`📄 File content length: ${content.length} characters`);
      
      // 2. Determine file format
      const isXER = this.detectXERFormat(content);
      console.log(`📋 File format detected: ${isXER ? 'XER' : 'CSV'}`);
      
      let projwbsData;
      if (isXER) {
        projwbsData = this.extractPROJWBSFromXER(content);
      } else {
        projwbsData = await this.extractPROJWBSFromCSV(content);
      }
      
      console.log(`📊 Raw PROJWBS records extracted: ${projwbsData.length}`);
      
      if (projwbsData.length === 0) {
        throw new Error('No PROJWBS data found in file. Please ensure this is a valid P6 export.');
      }
      
      // 4. Filter for target project
      const projectId = this.autoDetectProjectId(projwbsData);
      const projectWBS = this.filterByProject(projwbsData, projectId);
      
      console.log(`🎯 Project ${projectId}: Found ${projectWBS.length} WBS elements`);
      
      // 5. Build hierarchy map
      this.buildHierarchyMapFixed(projectWBS);
      
      // 6. Identify parent structures
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
      console.error('🚫 XER Parser Error:', error);
      throw new Error(`Failed to parse XER file: ${error.message}`);
    }
  }

  /**
   * Enhanced file format detection
   */
  detectXERFormat(content) {
    const xerIndicators = ['%T\tPROJWBS', '%F\t', '%R\t'];
    const hasXERIndicators = xerIndicators.some(indicator => content.includes(indicator));
    
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
   * Extract PROJWBS table from XER format
   */
  extractPROJWBSFromXER(content) {
    console.log('🔍 Extracting PROJWBS table from XER format');
    
    const lines = content.split('\n');
    const projwbsTable = [];
    
    let inPROJWBSTable = false;
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '%T\tPROJWBS') {
        inPROJWBSTable = true;
        console.log(`📍 Found PROJWBS table at line ${i + 1}`);
        continue;
      }
      
      if (inPROJWBSTable && line.startsWith('%T\t')) {
        console.log(`📍 End of PROJWBS table at line ${i + 1}`);
        break;
      }
      
      if (inPROJWBSTable && line.startsWith('%F\t')) {
        headers = line.substring(3).split('\t');
        console.log(`📋 PROJWBS headers (${headers.length}):`, headers.join(', '));
        continue;
      }
      
      if (inPROJWBSTable && line.startsWith('%R\t') && headers.length > 0) {
        const values = line.substring(3).split('\t');
        const record = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        
        projwbsTable.push(record);
      }
    }
    
    console.log(`✅ Extracted ${projwbsTable.length} PROJWBS records from XER format`);
    return projwbsTable;
  }

  /**
   * Extract PROJWBS from CSV format
   */
  async extractPROJWBSFromCSV(content) {
    console.log('🔍 Extracting PROJWBS data from CSV format');
    
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const projwbsTable = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const record = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] ? values[index].trim().replace(/['"]/g, '') : '';
      });
      
      projwbsTable.push(record);
    }
    
    console.log(`✅ Extracted ${projwbsTable.length} records from CSV format`);
    return projwbsTable;
  }

  /**
   * Auto-detect the main project ID from PROJWBS data
   */
  autoDetectProjectId(projwbsData) {
    console.log('🔍 Auto-detecting main project ID from PROJWBS data');
    
    const projectCounts = {};
    projwbsData.forEach(record => {
      const projId = record.proj_id;
      if (projId) {
        projectCounts[projId] = (projectCounts[projId] || 0) + 1;
      }
    });
    
    const projectEntries = Object.entries(projectCounts);
    if (projectEntries.length === 0) {
      throw new Error('No project IDs found in PROJWBS data');
    }
    
    const mainProjectId = projectEntries.reduce((a, b) => 
      projectCounts[a] > projectCounts[b] ? a : b
    );
    
    console.log(`🎯 Auto-detected project ID: ${mainProjectId} (${projectCounts[mainProjectId]} elements)`);
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
   * Build hierarchy map with enhanced parent-child relationship logic
   */
  buildHierarchyMapFixed(projectWBS) {
    console.log('🏗️ Building WBS hierarchy map with enhanced logic');
    
    this.wbsHierarchy.clear();
    
    const wbsLookup = new Map();
    projectWBS.forEach(element => {
      wbsLookup.set(element.wbs_id, element);
    });
    
    console.log(`📊 Created lookup map with ${wbsLookup.size} elements`);
    
    let rootNodes = 0;
    let orphanedNodes = 0;
    
    projectWBS.forEach(element => {
      const parentId = element.parent_wbs_id;
      
      if (!parentId || parentId === '' || parentId === element.wbs_id) {
        if (!this.wbsHierarchy.has(null)) {
          this.wbsHierarchy.set(null, []);
        }
        this.wbsHierarchy.get(null).push(element);
        rootNodes++;
      } else {
        const parentExists = wbsLookup.has(parentId);
        
        if (parentExists) {
          if (!this.wbsHierarchy.has(parentId)) {
            this.wbsHierarchy.set(parentId, []);
          }
          this.wbsHierarchy.get(parentId).push(element);
        } else {
          if (this.debugMode) {
            console.warn(`⚠️ Orphaned node ${element.wbs_id} (parent ${parentId} not found)`);
          }
          orphanedNodes++;
          
          if (!this.wbsHierarchy.has(null)) {
            this.wbsHierarchy.set(null, []);
          }
          this.wbsHierarchy.get(null).push(element);
        }
      }
    });
    
    console.log(`✅ Hierarchy built successfully`);
    console.log(`   📊 Root nodes: ${rootNodes}`);
    console.log(`   📊 Orphaned nodes: ${orphanedNodes}`);
    console.log(`   📊 Parent groups: ${this.wbsHierarchy.size}`);
    
    if (this.debugMode && rootNodes > 10) {
      console.warn(`⚠️ Unusually high number of root nodes (${rootNodes}). This may indicate hierarchy parsing issues.`);
    }
  }

  /**
   * Identify parent structures with enhanced pattern matching
   */
  identifyParentStructuresFixed(wbsElements) {
    console.log('🔍 Analyzing WBS patterns with enhanced recognition');
    
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
      parentStructures.root = rootElements[0];
      console.log(`🏠 Found root element: "${rootElements[0].wbs_name}"`);
      
      if (rootElements.length > 1) {
        console.warn(`⚠️ Multiple root elements found (${rootElements.length}). Using first one.`);
      }
    }

    let matchCount = 0;

    wbsElements.forEach(element => {
      const name = element.wbs_name;
      
      // Check Prerequisites patterns
      if (patterns.prerequisites.some(pattern => pattern.test(name))) {
        parentStructures.prerequisites = element;
        matchCount++;
        console.log(`📋 Prerequisites found: "${name}" (ID: ${element.wbs_id})`);
      }
      // Check Milestones patterns
      else if (patterns.milestones.some(pattern => pattern.test(name))) {
        parentStructures.milestones = element;
        matchCount++;
        console.log(`🎯 Milestones found: "${name}" (ID: ${element.wbs_id})`);
      }
      // Check Energisation patterns
      else if (patterns.energisation.some(pattern => pattern.test(name))) {
        parentStructures.energisation = element;
        matchCount++;
        console.log(`⚡ Energisation found: "${name}" (ID: ${element.wbs_id})`);
      }
      // Check TBC Section patterns
      else if (patterns.tbcSection.some(pattern => pattern.test(name))) {
        parentStructures.tbcSection = element;
        matchCount++;
        console.log(`⏳ TBC Section found: "${name}" (ID: ${element.wbs_id})`);
      }
      // Check Subsystem patterns
      else {
        patterns.subsystem.forEach(pattern => {
          const match = name.match(pattern);
          if (match) {
            const subsystemInfo = {
              element: element,
              subsystemNumber: parseInt(match[1]),
              zoneCode: match[2],
              name: name
            };
            parentStructures.subsystems.push(subsystemInfo);
            matchCount++;
            console.log(`🏢 Subsystem S${match[1]} found: "${name}" (Zone: ${match[2]}, ID: ${element.wbs_id})`);
          }
        });
      }
    });

    // Sort subsystems by number
    parentStructures.subsystems.sort((a, b) => a.subsystemNumber - b.subsystemNumber);

    console.log(`🎯 Parent Structure Analysis Complete:`);
    console.log(`   Total matches: ${matchCount}`);
    console.log(`   Prerequisites: ${parentStructures.prerequisites ? '✅' : '❌'}`);
    console.log(`   Milestones: ${parentStructures.milestones ? '✅' : '❌'}`);
    console.log(`   Energisation: ${parentStructures.energisation ? '✅' : '❌'}`);
    console.log(`   Subsystems: ${parentStructures.subsystems.length} found`);
    console.log(`   TBC Section: ${parentStructures.tbcSection ? '✅' : '❌'}`);

    // Warning if no patterns found
    if (matchCount === 0) {
      console.warn('⚠️ No standard parent structure patterns found!');
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
    console.log('🔍 Validating parsing results...');
    
    const validation = {
      hasRootElement: !!this.projectInfo.rootWbsId,
      hasHierarchy: this.wbsHierarchy.size > 0,
      hasParentStructures: Object.values(parentStructures).some(v => v !== null && (!Array.isArray(v) || v.length > 0)),
      totalElements: projectWBS.length
    };
    
    console.log('📊 Validation Results:');
    console.log(`   Root Element: ${validation.hasRootElement ? '✅' : '❌'}`);
    console.log(`   Hierarchy Built: ${validation.hasHierarchy ? '✅' : '❌'}`);
    console.log(`   Parent Structures: ${validation.hasParentStructures ? '✅' : '❌'}`);
    console.log(`   Total Elements: ${validation.totalElements}`);
    
    if (!validation.hasParentStructures) {
      console.warn('⚠️ No parent structures detected. This may indicate:');
      console.warn('   1. Non-standard WBS naming conventions');
      console.warn('   2. File format issues');
      console.warn('   3. Missing required WBS sections');
    }
    
    return validation;
  }

  /**
   * Calculate maximum hierarchy levels from the built hierarchy map
   * FIXED: This method now properly calculates hierarchy depth
   */
  calculateHierarchyLevels() {
    console.log('🔢 Calculating hierarchy levels from built hierarchy map');
    
    if (this.wbsHierarchy.size === 0) {
      console.warn('⚠️ No hierarchy map available for level calculation');
      return 0;
    }
    
    let maxLevel = 0;
    
    const traverseHierarchy = (nodeId, currentLevel) => {
      maxLevel = Math.max(maxLevel, currentLevel);
      
      if (this.wbsHierarchy.has(nodeId)) {
        const children = this.wbsHierarchy.get(nodeId);
        children.forEach(child => {
          traverseHierarchy(child.wbs_id, currentLevel + 1);
        });
      }
    };
    
    // Start from root nodes (null parent)
    if (this.wbsHierarchy.has(null)) {
      const rootNodes = this.wbsHierarchy.get(null);
      console.log(`🏠 Starting traversal from ${rootNodes.length} root nodes`);
      
      rootNodes.forEach(rootNode => {
        traverseHierarchy(rootNode.wbs_id, 1);
      });
    }
    
    // Also traverse all parent nodes in the hierarchy
    for (const [parentId, children] of this.wbsHierarchy.entries()) {
      if (parentId !== null && children.length > 0) {
        traverseHierarchy(parentId, this.calculateNodeLevel(parentId));
      }
    }
    
    console.log(`✅ Hierarchy calculation complete - Maximum depth: ${maxLevel} levels`);
    return maxLevel;
  }

  /**
   * Calculate the level of a specific node by tracing back to root
   */
  calculateNodeLevel(nodeId) {
    let level = 1;
    
    // Find the node in our WBS elements to trace its parents
    const allNodes = [];
    for (const [parentId, children] of this.wbsHierarchy.entries()) {
      allNodes.push(...children);
    }
    
    const findNode = (id) => allNodes.find(node => node.wbs_id === id);
    let currentNode = findNode(nodeId);
    
    while (currentNode && currentNode.parent_wbs_id) {
      level++;
      currentNode = findNode(currentNode.parent_wbs_id);
      if (level > 50) break; // Safety check to prevent infinite loops
    }
    
    return level;
  }
}

// ============================================================================
// PARENT STRUCTURE MANAGER
// ============================================================================

export class ParentStructureManager {
  constructor() {
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

  identifyParentStructures(wbsElements) {
    console.log('🔍 Enhanced Parent Structure Manager: Analyzing patterns');
    return new XERParser().identifyParentStructuresFixed(wbsElements);
  }

  findNextSubsystemNumber(existingSubsystems) {
    if (existingSubsystems.length === 0) return 1;
    
    const numbers = existingSubsystems.map(s => s.subsystemNumber);
    const nextNumber = Math.max(...numbers) + 1;
    
    console.log(`🔢 Next subsystem number: S${nextNumber}`);
    return nextNumber;
  }

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

    console.log(`🔍 Parent Structure Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Warnings: ${validation.warnings.length}`);
    console.log(`   Errors: ${validation.errors.length}`);

    return validation;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const createXERParser = () => {
  return new XERParser();
};

export const createParentStructureManager = () => {
  return new ParentStructureManager();
};

export const analyzeXERFile = async (file) => {
  const parser = new XERParser();
  const structureManager = new ParentStructureManager();
  
  console.log('🚀 Starting comprehensive XER file analysis');
  
  try {
    const parseResults = await parser.parseXERFile(file);
    const parentStructures = parseResults.parentStructures;
    const validation = structureManager.validateParentStructures(parentStructures);
    
    // FIXED: Now includes proper hierarchy level calculation
    const hierarchyLevels = parser.calculateHierarchyLevels();
    
    const analysis = {
      ...parseResults,
      parentStructures,
      validation,
      hierarchyLevels, // This will now show the correct value
      summary: {
        projectName: parseResults.projectInfo.projectName,
        totalElements: parseResults.totalElements,
        subsystemCount: parentStructures.subsystems.length,
        nextSubsystemNumber: structureManager.findNextSubsystemNumber(parentStructures.subsystems),
        hasPrerequisites: !!parentStructures.prerequisites,
        hasMilestones: !!parentStructures.milestones,
        validationPassed: validation.isValid,
        hierarchyLevels: hierarchyLevels // And here too
      }
    };
    
    console.log('✅ XER file analysis complete');
    console.log(`📊 Summary: ${analysis.summary.totalElements} elements, ${analysis.summary.subsystemCount} subsystems`);
    console.log(`📏 Hierarchy levels: ${hierarchyLevels}`);
    
    return analysis;
    
  } catch (error) {
    console.error('🚫 XER Analysis failed:', error);
    throw error;
  }
};

// ============================================================================
// EXPORT FUNCTIONS FOR MULTI-PROJECT SUPPORT
// ============================================================================

/**
 * Analyze XER file and get available projects
 */
export const getAvailableProjects = async (file) => {
  console.log('🚨 DEBUG: Real getAvailableProjects function called!');
  console.log('🚨 DEBUG: File name:', file.name);
  console.log('🚨 DEBUG: File size:', file.size);
  
  const parser = new XERParser();
  console.log('🚀 Starting XER file analysis for project discovery');
  
  try {
    const content = await parser.readFile(file);
    console.log(`📄 File content length: ${content.length} characters`);
    
    const isXER = parser.detectXERFormat(content);
    console.log(`📋 File format detected: ${isXER ? 'XER' : 'CSV/Excel'}`);
    
    let projwbsData;
    let projectTable = [];
    
    if (isXER) {
      const { projectTable: projects, projwbsTable } = extractTablesFromXER(content);
      projectTable = projects;
      projwbsData = projwbsTable;
    } else {
      projwbsData = await extractPROJWBSFromFile(file);
      
      const projectId = autoDetectProjectId(projwbsData);
      projectTable = [{
        proj_id: projectId,
        proj_short_name: `Project_${projectId}`,
        project_flag: 'Y'
      }];
    }
    
    const availableProjects = extractAvailableProjectsFromData(projectTable, projwbsData);
    
    console.log(`✅ XER Analysis Complete: ${availableProjects.length} projects found`);
    
    return {
      parser: parser,
      availableProjects: availableProjects,
      totalProjects: availableProjects.length,
      totalWBSElements: projwbsData.length,
      requiresProjectSelection: availableProjects.length > 1,
      projwbsData: projwbsData
    };
    
  } catch (error) {
    console.error('🚫 XER Analysis failed:', error);
    throw error;
  }
};

/**
 * Process selected project after project selection
 */
// QUICK FIX for xerParser.js - processSelectedProject function
// Replace the existing processSelectedProject function with this fixed version:

export const processSelectedProject = async (analysisResult, projectId) => {
  console.log('🚨 DEBUG: Real processSelectedProject function called!');
  console.log(`🎯 Processing selected project: ${projectId}`);
  
  try {
    const parser = analysisResult.parser;
    const projwbsData = analysisResult.projwbsData;
    
    const projectWBS = projwbsData.filter(record => 
      record.proj_id?.toString() === projectId?.toString()
    );
    
    console.log(`📊 Project ${projectId}: Found ${projectWBS.length} WBS elements`);
    
    parser.buildHierarchyMapFixed(projectWBS);
    const parentStructures = parser.identifyParentStructuresFixed(projectWBS);
    
    const selectedProject = analysisResult.availableProjects.find(p => p.proj_id === projectId);
    const rootElement = projectWBS.find(el => !el.parent_wbs_id || el.parent_wbs_id === '');
    
    const projectInfo = {
      projectId: projectId,
      projectName: rootElement?.wbs_name || selectedProject?.project_name || `Project ${projectId}`,
      projectCode: selectedProject?.project_code || rootElement?.wbs_short_name || '',
      rootWbsId: rootElement?.wbs_id || null,
      totalElements: projectWBS.length,
      planStartDate: selectedProject?.plan_start_date,
      planEndDate: selectedProject?.plan_end_date
    };
    
    // *** FIX: Set projectInfo on parser instance before validation ***
    parser.projectInfo = projectInfo;
    
    const validation = parser.validateResults(projectWBS, parentStructures);
    
    console.log(`✅ Project processing complete: ${projectWBS.length} elements processed`);
    
    return {
      selectedProject: selectedProject,
      wbsElements: projectWBS,
      hierarchy: parser.wbsHierarchy,
      parentStructures: parentStructures,
      projectInfo: projectInfo,
      totalElements: projectWBS.length,
      validation: validation
    };
    
  } catch (error) {
    console.error('🚫 Project processing failed:', error);
    throw error;
  }
};

// ============================================================================
// HELPER FUNCTIONS FOR MULTI-PROJECT SUPPORT
// ============================================================================

function extractTablesFromXER(content) {
  console.log('🔍 ENHANCED: Extracting PROJECT and PROJWBS tables from XER format');
  
  const lines = content.split('\n');
  const projectTable = [];
  const projwbsTable = [];
  
  let currentTable = null;
  let currentHeaders = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '%T\tPROJECT') {
      currentTable = 'PROJECT';
      console.log(`📍 Found PROJECT table at line ${i + 1}`);
      continue;
    } else if (line === '%T\tPROJWBS') {
      currentTable = 'PROJWBS';
      console.log(`📍 Found PROJWBS table at line ${i + 1}`);
      continue;
    }
    
    if (currentTable && line.startsWith('%F\t')) {
      currentHeaders = line.substring(3).split('\t');
      console.log(`📋 ${currentTable} headers (${currentHeaders.length}):`, currentHeaders.slice(0, 5).join(', '), '...');
      continue;
    }
    
    if (currentTable && line.startsWith('%R\t') && currentHeaders.length > 0) {
      const values = line.substring(3).split('\t');
      const record = {};
      
      currentHeaders.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      if (currentTable === 'PROJECT') {
        projectTable.push(record);
      } else if (currentTable === 'PROJWBS') {
        projwbsTable.push(record);
      }
    }
    
    if (line.startsWith('%T\t') && currentTable) {
      console.log(`📍 End of ${currentTable} table at line ${i + 1}`);
      currentTable = null;
      currentHeaders = [];
    }
  }
  
  console.log(`✅ Extracted ${projectTable.length} PROJECT and ${projwbsTable.length} PROJWBS records`);
  
  return {
    projectTable: projectTable,
    projwbsTable: projwbsTable
  };
}

function extractAvailableProjectsFromData(projectTable, projwbsData) {
  console.log('🔍 Extracting available projects from data');
  
  const projectSummaries = projectTable
    .filter(proj => proj.project_flag === 'Y')
    .map(proj => {
      const wbsCount = projwbsData.filter(wbs => 
        wbs.proj_id?.toString() === proj.proj_id?.toString()
      ).length;
      
      return {
        proj_id: proj.proj_id,
        project_name: proj.proj_short_name || `Project ${proj.proj_id}`,
        project_code: proj.proj_short_name || '',
        wbs_count: wbsCount,
        plan_start_date: proj.plan_start_date,
        plan_end_date: proj.plan_end_date
      };
    })
    .filter(proj => proj.wbs_count > 0)
    .sort((a, b) => b.wbs_count - a.wbs_count);
  
  console.log(`✅ Found ${projectSummaries.length} available projects with WBS data`);
  
  return projectSummaries;
}

function autoDetectProjectId(projwbsData) {
  const projectCounts = {};
  projwbsData.forEach(record => {
    const projId = record.proj_id;
    if (projId) {
      projectCounts[projId] = (projectCounts[projId] || 0) + 1;
    }
  });
  
  const projectEntries = Object.entries(projectCounts);
  if (projectEntries.length === 0) {
    throw new Error('No project IDs found in data');
  }
  
  const mainProjectId = projectEntries.reduce((a, b) => 
    projectCounts[a] > projectCounts[b] ? a : b
  );
  
  return mainProjectId;
}

async function extractPROJWBSFromFile(file) {
  // Implementation for extracting PROJWBS from uploaded files
  // This is a placeholder - you may need to implement based on your file format
  console.log('📄 Extracting PROJWBS from uploaded file');
  
  const parser = new XERParser();
  const content = await parser.readFile(file);
  
  if (parser.detectXERFormat(content)) {
    return parser.extractPROJWBSFromXER(content);
  } else {
    return parser.extractPROJWBSFromCSV(content);
  }
}
