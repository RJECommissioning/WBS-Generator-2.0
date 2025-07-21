// src/components/utils/xerParser.js
// Complete file with validation fix and enhanced project debugging
// UPDATED: Added analyzeXERFile wrapper for WBSGenerator.jsx compatibility

// ============================================================================
// ENHANCED XER PARSER CLASS
// ============================================================================

export class XERParser {
  constructor() {
    this.projwbsTable = [];
    this.wbsHierarchy = new Map();
    this.projectInfo = null;
    this.debugMode = true;
  }

  /**
   * Parse complete XER file for single project
   */
  async parseXERFile(file) {
    console.log('🚀 Starting enhanced XER file parsing');
    
    try {
      // 1. Read file content
      const content = await this.readFile(file);
      console.log(`📄 File content length: ${content.length} characters`);
      
      // 2. Detect format
      const isXER = this.detectXERFormat(content);
      console.log(`📋 File format detected: ${isXER ? 'XER' : 'CSV/Excel'}`);
      
      // 3. Extract PROJWBS data
      let projwbsData;
      if (isXER) {
        projwbsData = this.extractPROJWBSFromXER(content);
      } else {
        projwbsData = await this.extractPROJWBSFromFile(file);
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
      const validation = this.validateResults(projectWBS, parentStructures);
      
      return {
        wbsElements: projectWBS,
        hierarchy: this.wbsHierarchy,
        parentStructures: parentStructures,
        projectInfo: this.projectInfo,
        totalElements: projectWBS.length,
        validation: validation
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
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '%T\tPROJWBS') {
        inPROJWBSTable = true;
        continue;
      }
      
      if (inPROJWBSTable && trimmedLine.startsWith('%F\t')) {
        headers = trimmedLine.substring(3).split('\t');
        console.log(`📋 PROJWBS headers found: ${headers.length} columns`);
        continue;
      }
      
      if (inPROJWBSTable && trimmedLine.startsWith('%R\t')) {
        const values = trimmedLine.substring(3).split('\t');
        const record = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        
        projwbsTable.push(record);
      }
      
      if (inPROJWBSTable && trimmedLine.startsWith('%T\t') && !trimmedLine.includes('PROJWBS')) {
        break;
      }
    }
    
    console.log(`✅ Extracted ${projwbsTable.length} PROJWBS records`);
    return projwbsTable;
  }

  /**
   * Auto-detect primary project ID
   */
  autoDetectProjectId(projwbsData) {
    const projectCounts = {};
    
    projwbsData.forEach(record => {
      const projId = record.proj_id;
      if (projId) {
        projectCounts[projId] = (projectCounts[projId] || 0) + 1;
      }
    });
    
    const mainProjectId = Object.entries(projectCounts).reduce(
      (max, [projId, count]) => count > (projectCounts[max] || 0) ? projId : max, 
      Object.keys(projectCounts)[0]
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

    const parentStructures = {
      prerequisites: null,
      milestones: null,
      energisation: null,
      subsystems: [],
      tbcSection: null,
      root: null
    };

    let matchCount = 0;

    wbsElements.forEach(element => {
      const name = element.wbs_name || '';
      
      // Check for Prerequisites
      if (patterns.prerequisites.some(pattern => pattern.test(name))) {
        parentStructures.prerequisites = { element, wbs_id: element.wbs_id, wbs_name: name };
        console.log(`📋 Prerequisites found: "${name}" (ID: ${element.wbs_id})`);
        matchCount++;
      }
      
      // Check for Milestones
      else if (patterns.milestones.some(pattern => pattern.test(name))) {
        parentStructures.milestones = { element, wbs_id: element.wbs_id, wbs_name: name };
        console.log(`🎯 Milestones found: "${name}" (ID: ${element.wbs_id})`);
        matchCount++;
      }
      
      // Check for Energisation
      else if (patterns.energisation.some(pattern => pattern.test(name))) {
        parentStructures.energisation = { element, wbs_id: element.wbs_id, wbs_name: name };
        console.log(`⚡ Energisation found: "${name}" (ID: ${element.wbs_id})`);
        matchCount++;
      }
      
      // Check for Subsystems
      else if (patterns.subsystem.some(pattern => pattern.test(name))) {
        const match = name.match(patterns.subsystem.find(pattern => pattern.test(name)));
        if (match) {
          const subsystemData = {
            element,
            wbs_id: element.wbs_id,
            wbs_name: name,
            subsystemNumber: parseInt(match[1]),
            zoneCode: match[2]
          };
          
          parentStructures.subsystems.push(subsystemData);
          console.log(`🏢 Subsystem S${match[1]} found: "${name}" (Zone: ${match[2]}, ID: ${element.wbs_id})`);
          matchCount++;
        }
      }
      
      // Check for TBC Section
      else if (patterns.tbcSection.some(pattern => pattern.test(name))) {
        parentStructures.tbcSection = { element, wbs_id: element.wbs_id, wbs_name: name };
        console.log(`⏳ TBC Section found: "${name}" (ID: ${element.wbs_id})`);
        matchCount++;
      }
      
      // Check for root element
      if (!element.parent_wbs_id || element.parent_wbs_id === '') {
        parentStructures.root = { element, wbs_id: element.wbs_id, wbs_name: name };
      }
    });

    // Calculate hierarchy levels
    this.calculateHierarchyLevels();

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
   * Calculate hierarchy levels from built hierarchy map
   */
  calculateHierarchyLevels() {
    console.log('🔢 Calculating hierarchy levels from built hierarchy map');
    
    const rootElements = this.wbsHierarchy.get(null) || [];
    console.log(`🏠 Starting traversal from ${rootElements.length} root nodes`);
    
    let maxDepth = 0;
    
    const traverseDepth = (element, currentDepth = 1) => {
      maxDepth = Math.max(maxDepth, currentDepth);
      
      const children = this.wbsHierarchy.get(element.wbs_id) || [];
      children.forEach(child => traverseDepth(child, currentDepth + 1));
    };
    
    rootElements.forEach(rootElement => {
      traverseDepth(rootElement, 1);
    });
    
    console.log(`✅ Hierarchy calculation complete - Maximum depth: ${maxDepth} levels`);
    
    return maxDepth;
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
    
    // Check if projectInfo exists (should be set by now)
    if (!this.projectInfo) {
      console.error('❌ Critical Error: projectInfo is null during validation');
      throw new Error('Project information not available for validation');
    }
    
    const validation = {
      isValid: true,
      hasRootElement: !!this.projectInfo.rootWbsId,
      hasHierarchy: this.wbsHierarchy.size > 0,
      hasParentStructures: Object.values(parentStructures).some(v => v !== null && (!Array.isArray(v) || v.length > 0)),
      totalElements: projectWBS.length,
      errors: [],
      warnings: []
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
      validation.warnings.push('No standard parent structures detected');
    }
    
    return validation;
  }
}

// ============================================================================
// COMPATIBILITY WRAPPER FUNCTIONS FOR WBSGenerator.jsx
// ============================================================================

/**
 * Main analysis function that WBSGenerator.jsx expects
 * This wraps the existing XER parsing functionality
 */
export const analyzeXERFile = async (file) => {
  console.log('🎯 analyzeXERFile wrapper called - using existing XER parser');
  
  try {
    const parser = new XERParser();
    const results = await parser.parseXERFile(file);
    
    // Add summary with next subsystem number
    const summary = {
      projectName: results.projectInfo.projectName,
      totalElements: results.totalElements,
      nextSubsystemNumber: findNextSubsystemNumber(results.parentStructures.subsystems),
      validationPassed: results.validation.isValid
    };
    
    return {
      ...results,
      summary: summary
    };
    
  } catch (error) {
    console.error('🚫 analyzeXERFile wrapper failed:', error);
    throw error;
  }
};

/**
 * Helper function to find next subsystem number
 */
const findNextSubsystemNumber = (subsystems) => {
  if (!subsystems || subsystems.length === 0) return 1;
  
  const numbers = subsystems.map(s => s.subsystemNumber).filter(n => !isNaN(n));
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
};

// ============================================================================
// ENHANCED MULTI-PROJECT FUNCTIONS
// ============================================================================

/**
 * Analyze XER file and get available projects with enhanced debugging
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
      requiresProjectSelection: true, // ALWAYS require manual selection
      projwbsData: projwbsData
    };
    
  } catch (error) {
    console.error('🚫 XER Analysis failed:', error);
    throw error;
  }
};

/**
 * Process selected project after project selection - WITH VALIDATION FIX
 */
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
    
    // Build hierarchy and identify parent structures
    parser.buildHierarchyMapFixed(projectWBS);
    const parentStructures = parser.identifyParentStructuresFixed(projectWBS);
    
    // Get project details
    const selectedProject = analysisResult.availableProjects.find(p => p.proj_id === projectId);
    const rootElement = projectWBS.find(el => !el.parent_wbs_id || el.parent_wbs_id === '');
    
    // Create project info object
    const projectInfo = {
      projectId: projectId,
      projectName: rootElement?.wbs_name || selectedProject?.project_name || `Project ${projectId}`,
      projectCode: selectedProject?.project_code || rootElement?.wbs_short_name || '',
      rootWbsId: rootElement?.wbs_id || null,
      totalElements: projectWBS.length,
      planStartDate: selectedProject?.plan_start_date,
      planEndDate: selectedProject?.plan_end_date
    };
    
    // *** CRITICAL FIX: Set projectInfo on parser BEFORE validation ***
    parser.projectInfo = projectInfo;
    
    // Now validation will work because parser.projectInfo is set
    const validation = parser.validateResults(projectWBS, parentStructures);
    
    console.log(`✅ Project processing complete: ${projectWBS.length} elements processed`);
    
    return {
      selectedProject: selectedProject,
      wbsElements: projectWBS,
      hierarchy: parser.wbsHierarchy,
      parentStructures: parentStructures,
      projectInfo: projectInfo,
      totalElements: projectWBS.length,
      validation: validation  // Include validation results
    };
    
  } catch (error) {
    console.error('🚫 Project processing failed:', error);
    throw error;
  }
};

// ============================================================================
// HELPER FUNCTIONS WITH ENHANCED DEBUGGING
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
      console.log(`📋 ${currentTable} headers (${currentHeaders.length}): ${currentHeaders.slice(0, 5).join(', ')} ...`);
      continue;
    }
    
    if (currentTable && line.startsWith('%R\t')) {
      const values = line.substring(3).split('\t');
      const record = {};
      
      currentHeaders.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      if (currentTable === 'PROJECT') {
        projectTable.push(record);
        // *** ENHANCED DEBUG: Show each project found ***
        console.log(`🎯 PROJECT FOUND: ID=${record.proj_id}, Name="${record.proj_short_name}", Flag="${record.project_flag}"`);
      } else if (currentTable === 'PROJWBS') {
        projwbsTable.push(record);
      }
    }
    
    // Check for end of current table
    if (currentTable && (line.startsWith('%T\t') && !line.includes(currentTable))) {
      console.log(`📍 End of ${currentTable} table at line ${i + 1}`);
      
      // *** ENHANCED DEBUG: Summary of what we found ***
      if (currentTable === 'PROJECT') {
        console.log(`📊 PROJECT TABLE SUMMARY:`);
        projectTable.forEach((proj, index) => {
          console.log(`   ${index + 1}. ID: ${proj.proj_id} | Code: "${proj.proj_short_name}" | Flag: ${proj.project_flag} | Start: ${proj.plan_start_date}`);
        });
      }
      
      currentTable = null;
      currentHeaders = [];
    }
  }
  
  console.log(`✅ Extracted ${projectTable.length} PROJECT and ${projwbsTable.length} PROJWBS records`);
  
  // *** ENHANCED DEBUG: Final project analysis ***
  console.log(`🔍 FINAL PROJECT ANALYSIS:`);
  console.log(`   Total projects in file: ${projectTable.length}`);
  console.log(`   Active projects (project_flag='Y'): ${projectTable.filter(p => p.project_flag === 'Y').length}`);
  
  const projectWBSCounts = {};
  projwbsTable.forEach(wbs => {
    const projId = wbs.proj_id;
    if (projId) {
      projectWBSCounts[projId] = (projectWBSCounts[projId] || 0) + 1;
    }
  });
  
  console.log(`   Projects with WBS data:`);
  Object.entries(projectWBSCounts).forEach(([projId, count]) => {
    const project = projectTable.find(p => p.proj_id === projId);
    console.log(`     • Project ${projId} ("${project?.proj_short_name || 'Unknown'}"): ${count} WBS elements`);
  });
  
  return {
    projectTable: projectTable,
    projwbsTable: projwbsTable
  };
}

function autoDetectProjectId(projwbsData) {
  const projectCounts = {};
  
  projwbsData.forEach(record => {
    const projId = record.proj_id;
    if (projId) {
      projectCounts[projId] = (projectCounts[projId] || 0) + 1;
    }
  });
  
  const mainProjectId = Object.entries(projectCounts).reduce(
    (max, [projId, count]) => count > (projectCounts[max] || 0) ? projId : max, 
    Object.keys(projectCounts)[0]
  );
  
  console.log(`🎯 Auto-detected project ID: ${mainProjectId} (${projectCounts[mainProjectId]} elements)`);
  return mainProjectId;
}

function extractAvailableProjectsFromData(projectTable, projwbsData) {
  console.log('🔍 Extracting available projects with WBS counts');
  
  const projectWBSCounts = {};
  projwbsData.forEach(wbs => {
    const projId = wbs.proj_id;
    if (projId) {
      projectWBSCounts[projId] = (projectWBSCounts[projId] || 0) + 1;
    }
  });
  
  const availableProjects = projectTable
    .filter(project => project.project_flag === 'Y' && projectWBSCounts[project.proj_id] > 0)
    .map(project => {
      const wbsCount = projectWBSCounts[project.proj_id] || 0;
      
      const rootWBS = projwbsData.find(wbs => 
        wbs.proj_id === project.proj_id && 
        (!wbs.parent_wbs_id || wbs.parent_wbs_id === '')
      );
      
      return {
        proj_id: project.proj_id,
        project_name: rootWBS?.wbs_name || project.proj_short_name || `Project ${project.proj_id}`,
        project_code: project.proj_short_name || '',
        wbs_element_count: wbsCount,
        plan_start_date: project.plan_start_date,
        plan_end_date: project.plan_end_date,
        project_flag: project.project_flag
      };
    })
    .sort((a, b) => b.wbs_element_count - a.wbs_element_count);
  
  console.log('🎯 Available Projects:');
  availableProjects.forEach(project => {
    console.log(`   📊 ${project.proj_id}: "${project.project_name}" (${project.wbs_element_count} elements)`);
  });
  
  return availableProjects;
}
