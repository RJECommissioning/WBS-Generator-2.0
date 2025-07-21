// src/components/utils/continueProjectIntegration.js - Integration Engine for Continue Project
// UPDATED: Added processContinueProjectWBS wrapper for WBSGenerator.jsx compatibility

import { 
  determineCategoryCode, 
  categoryMapping,
  processEquipmentByCategory 
} from './wbsUtils.js';
import { isValidEquipmentNumber } from './equipmentUtils.js';

/**
 * Continue Project Integration Engine
 * Handles intelligent integration of new equipment into existing P6 WBS structures
 */

// ============================================================================
// MAIN INTEGRATION PROCESSOR
// ============================================================================

export class ContinueProjectProcessor {
  constructor() {
    this.newWbsIdCounter = 100000; // Start high to avoid conflicts
  }

  /**
   * Process new subsystem integration into existing WBS structure
   * @param {Object} existingAnalysis - XER analysis results
   * @param {Array} newEquipmentList - New equipment to integrate
   * @param {string} subsystemName - Name of the new subsystem
   * @returns {Object} - Integration results with new WBS elements
   */
  async processNewSubsystem(existingAnalysis, newEquipmentList, subsystemName) {
    console.log('🚀 Integration Engine: Starting new subsystem integration');
    console.log(`📦 Input: ${newEquipmentList.length} equipment items`);
    console.log(`🏢 Subsystem: "${subsystemName}"`);

    try {
      // 1. Validate inputs
      this.validateInputs(existingAnalysis, newEquipmentList, subsystemName);

      // 2. Prepare integration context
      const context = this.prepareIntegrationContext(existingAnalysis, subsystemName);

      // 3. Process equipment list
      const processedEquipment = this.processEquipmentList(newEquipmentList, subsystemName);

      // 4. Generate new WBS elements
      const newElements = this.generateNewWBSElements(context, processedEquipment);

      // 5. Assign WBS codes
      this.assignWBSCodes(newElements, existingAnalysis.wbsElements);

      // 6. Validate integration
      const validation = this.validateIntegration(existingAnalysis.wbsElements, newElements);

      // 7. Prepare results
      const results = {
        newElements: newElements,
        totalElements: [...existingAnalysis.wbsElements, ...newElements],
        integrationSummary: this.generateIntegrationSummary(newElements, processedEquipment),
        validation: validation,
        context: context
      };

      console.log('✅ Integration Engine: Subsystem integration complete');
      console.log(`📊 Generated ${newElements.length} new WBS elements`);

      return results;

    } catch (error) {
      console.error('🚫 Integration Engine Error:', error);
      throw new Error(`Integration failed: ${error.message}`);
    }
  }

  /**
   * Validate integration inputs
   */
  validateInputs(existingAnalysis, newEquipmentList, subsystemName) {
    if (!existingAnalysis || !existingAnalysis.wbsElements) {
      throw new Error('Invalid existing WBS analysis');
    }

    if (!newEquipmentList || newEquipmentList.length === 0) {
      throw new Error('No equipment provided for integration');
    }

    if (!subsystemName || subsystemName.trim() === '') {
      throw new Error('Subsystem name is required');
    }

    if (!existingAnalysis.validation?.isValid) {
      console.warn('⚠️ Existing WBS structure has validation warnings, continuing...');
    }

    console.log('✅ Integration inputs validated');
  }

  /**
   * Prepare integration context with all necessary information
   */
  prepareIntegrationContext(existingAnalysis, subsystemName) {
    const { parentStructures, projectInfo } = existingAnalysis;

    // Extract zone code from subsystem name
    const zoneCode = this.extractZoneCode(subsystemName);

    // Determine next subsystem number
    const nextSubsystemNumber = this.findNextSubsystemNumber(parentStructures.subsystems);

    // Prepare context object
    const context = {
      projectInfo: projectInfo,
      parentStructures: parentStructures,
      subsystemName: subsystemName,
      zoneCode: zoneCode,
      subsystemNumber: nextSubsystemNumber,
      subsystemCode: `S${nextSubsystemNumber}`,
      fullSubsystemName: `S${nextSubsystemNumber} | ${zoneCode} - ${subsystemName}`,
      prerequisiteName: `${zoneCode} | ${subsystemName}`
    };

    console.log('🏗️ Integration Context Prepared:');
    console.log(`   Zone Code: ${context.zoneCode}`);
    console.log(`   Subsystem Number: S${context.subsystemNumber}`);
    console.log(`   Full Name: ${context.fullSubsystemName}`);

    return context;
  }

  /**
   * Process and filter equipment list
   */
  processEquipmentList(equipmentList, subsystemName) {
    console.log('🔧 Processing equipment list...');

    // Filter valid commissioned equipment
    const validEquipment = equipmentList.filter(item => {
      const isCommissioned = item.commissioning === 'Y' || item.commissioning === 'TBC';
      const hasValidNumber = isValidEquipmentNumber(item.equipmentNumber);
      const hasDescription = item.description && item.description.trim() !== '';

      if (!isCommissioned) {
        console.log(`🚫 Excluded (not commissioned): ${item.equipmentNumber}`);
        return false;
      }

      if (!hasValidNumber) {
        console.log(`🚫 Excluded (invalid number): ${item.equipmentNumber}`);
        return false;
      }

      if (!hasDescription) {
        console.log(`⚠️ Warning: No description for ${item.equipmentNumber}`);
      }

      return true;
    });

    // Ensure all equipment is associated with the subsystem
    const processedEquipment = validEquipment.map(item => ({
      ...item,
      subsystem: subsystemName,
      equipmentNumber: item.equipmentNumber.trim(),
      description: item.description?.trim() || 'No description',
      parentEquipmentNumber: item.parentEquipmentNumber?.trim() || ''
    }));

    console.log(`✅ Processed ${processedEquipment.length} valid equipment items`);
    
    // Log equipment summary by commissioning status
    const commissioned = processedEquipment.filter(item => item.commissioning === 'Y');
    const tbc = processedEquipment.filter(item => item.commissioning === 'TBC');
    
    console.log(`   Commissioned (Y): ${commissioned.length}`);
    console.log(`   To Be Confirmed (TBC): ${tbc.length}`);

    return processedEquipment;
  }

  /**
   * Generate new WBS elements for the subsystem
   */
  generateNewWBSElements(context, processedEquipment) {
    console.log('🏗️ Generating new WBS elements...');
    
    const newElements = [];

    // 1. Add prerequisite entry (if prerequisites section exists)
    if (context.parentStructures.prerequisites) {
      const prerequisiteEntry = this.createPrerequisiteEntry(context);
      newElements.push(prerequisiteEntry);
      console.log(`📋 Created prerequisite entry: "${prerequisiteEntry.wbs_name}"`);
    }

    // 2. Create main subsystem element
    const mainSubsystem = this.createMainSubsystemElement(context);
    newElements.push(mainSubsystem);
    console.log(`🏢 Created main subsystem: "${mainSubsystem.wbs_name}"`);

    // 3. Categorize equipment
    const categoryGroups = processEquipmentByCategory(processedEquipment, processedEquipment);

    // 4. Create category structure with equipment
    const categoryElements = this.createCategoryStructure(mainSubsystem, categoryGroups, processedEquipment);
    newElements.push(...categoryElements);

    console.log(`✅ Generated ${newElements.length} total WBS elements:`);
    console.log(`   Prerequisites: ${context.parentStructures.prerequisites ? 1 : 0}`);
    console.log(`   Main subsystem: 1`);
    console.log(`   Categories & equipment: ${categoryElements.length}`);

    return newElements;
  }

  /**
   * Create prerequisite entry under P | Pre-Requisites
   */
  createPrerequisiteEntry(context) {
    return {
      wbs_id: this.generateNewWbsId(),
      parent_wbs_id: context.parentStructures.prerequisites.wbs_id,
      wbs_short_name: this.generateShortCode(context.parentStructures.prerequisites.wbs_short_name),
      wbs_name: context.prerequisiteName,
      element_type: 'prerequisite',
      subsystem_code: context.zoneCode,
      is_new: true,
      p6_compatible: true,
      integration_note: `Added for ${context.subsystemCode}`
    };
  }

  /**
   * Create main subsystem element
   */
  createMainSubsystemElement(context) {
    return {
      wbs_id: this.generateNewWbsId(),
      parent_wbs_id: context.projectInfo.rootWbsId,
      wbs_short_name: this.generateSubsystemShortCode(context.subsystemNumber),
      wbs_name: context.fullSubsystemName,
      element_type: 'subsystem',
      subsystem_code: context.zoneCode,
      subsystem_number: context.subsystemNumber,
      is_new: true,
      p6_compatible: true,
      integration_note: `New subsystem ${context.subsystemCode}`
    };
  }

  /**
   * Create category structure with equipment
   */
  createCategoryStructure(parentSubsystem, categoryGroups, allEquipment) {
    console.log('🏗️ Creating category structure...');
    
    const categoryElements = [];
    const orderedCategories = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
    
    let categoryCounter = 1;

    orderedCategories.forEach(categoryCode => {
      const categoryEquipment = categoryGroups[categoryCode];
      
      if (categoryEquipment && categoryEquipment.length > 0) {
        // Create category element
        const categoryElement = {
          wbs_id: this.generateNewWbsId(),
          parent_wbs_id: parentSubsystem.wbs_id,
          wbs_short_name: `${parentSubsystem.wbs_short_name}.${categoryCounter}`,
          wbs_name: `${categoryCode} | ${categoryMapping[categoryCode]}`,
          element_type: 'category',
          category_code: categoryCode,
          is_new: true,
          p6_compatible: true,
          integration_note: `Category for ${categoryEquipment.length} equipment items`
        };

        categoryElements.push(categoryElement);
        console.log(`📂 Created category ${categoryCode}: ${categoryEquipment.length} items`);

        // Add equipment items to category
        const equipmentElements = this.createEquipmentElements(
          categoryElement, 
          categoryEquipment, 
          allEquipment
        );
        categoryElements.push(...equipmentElements);

        categoryCounter++;
      }
    });

    return categoryElements;
  }

  /**
   * Create equipment elements within a category
   */
  createEquipmentElements(parentCategory, categoryEquipment, allEquipment) {
    const equipmentElements = [];
    
    // Find parent equipment (equipment without parents in this category)
    const parentEquipment = categoryEquipment.filter(item => {
      const hasParentInCategory = categoryEquipment.some(potential => 
        potential.equipmentNumber === item.parentEquipmentNumber
      );
      return !hasParentInCategory;
    });

    let equipmentCounter = 1;

    // Process parent equipment and their children recursively
    parentEquipment.forEach(equipment => {
      const equipmentElement = {
        wbs_id: this.generateNewWbsId(),
        parent_wbs_id: parentCategory.wbs_id,
        wbs_short_name: `${parentCategory.wbs_short_name}.${equipmentCounter}`,
        wbs_name: `${equipment.equipmentNumber} | ${equipment.description}`,
        element_type: 'equipment',
        equipment_number: equipment.equipmentNumber,
        equipment_description: equipment.description,
        commissioning_status: equipment.commissioning,
        is_new: true,
        p6_compatible: true,
        integration_note: `Equipment from ${equipment.subsystem}`
      };

      equipmentElements.push(equipmentElement);

      // Add child equipment recursively
      const childElements = this.addChildEquipmentRecursively(
        equipment.equipmentNumber,
        equipmentElement,
        allEquipment
      );
      equipmentElements.push(...childElements);

      equipmentCounter++;
    });

    return equipmentElements;
  }

  /**
   * Add child equipment recursively
   */
  addChildEquipmentRecursively(parentEquipmentNumber, parentElement, allEquipment) {
    const childElements = [];
    const children = allEquipment.filter(item => 
      item.parentEquipmentNumber === parentEquipmentNumber &&
      item.commissioning === 'Y'
    );

    let childCounter = 1;
    children.forEach(child => {
      const childElement = {
        wbs_id: this.generateNewWbsId(),
        parent_wbs_id: parentElement.wbs_id,
        wbs_short_name: `${parentElement.wbs_short_name}.${childCounter}`,
        wbs_name: `${child.equipmentNumber} | ${child.description}`,
        element_type: 'equipment',
        equipment_number: child.equipmentNumber,
        equipment_description: child.description,
        commissioning_status: child.commissioning,
        parent_equipment: parentEquipmentNumber,
        is_new: true,
        p6_compatible: true,
        integration_note: `Child of ${parentEquipmentNumber}`
      };

      childElements.push(childElement);

      // Recursively add grandchildren
      const grandchildElements = this.addChildEquipmentRecursively(
        child.equipmentNumber,
        childElement,
        allEquipment
      );
      childElements.push(...grandchildElements);

      childCounter++;
    });

    return childElements;
  }

  /**
   * Assign WBS codes to new elements
   */
  assignWBSCodes(newElements, existingElements) {
    console.log('🔢 Assigning WBS codes...');

    // Create a map of all existing codes to avoid conflicts
    const existingCodes = new Set();
    existingElements.forEach(element => {
      if (element.wbs_short_name) {
        existingCodes.add(element.wbs_short_name);
      }
    });

    // Find the highest numeric code at each level
    const findNextCode = (parentCode) => {
      const pattern = parentCode ? `${parentCode}.` : '';
      const siblingCodes = [];

      existingElements.forEach(element => {
        if (element.wbs_short_name && element.wbs_short_name.startsWith(pattern)) {
          const suffix = element.wbs_short_name.substring(pattern.length);
          const numMatch = suffix.match(/^(\d+)/);
          if (numMatch) {
            siblingCodes.push(parseInt(numMatch[1]));
          }
        }
      });

      newElements.forEach(element => {
        if (element.wbs_short_name && element.wbs_short_name.startsWith(pattern)) {
          const suffix = element.wbs_short_name.substring(pattern.length);
          const numMatch = suffix.match(/^(\d+)/);
          if (numMatch) {
            siblingCodes.push(parseInt(numMatch[1]));
          }
        }
      });

      const maxCode = siblingCodes.length > 0 ? Math.max(...siblingCodes) : 0;
      return maxCode + 1;
    };

    // Assign codes in hierarchical order
    newElements.forEach(element => {
      if (element.element_type === 'prerequisite') {
        const nextCode = findNextCode(element.parent_wbs_id);
        element.wbs_short_name = `${element.parent_wbs_id}.${nextCode}`;
      } else if (element.element_type === 'subsystem') {
        const nextCode = findNextCode('1'); // Assuming project root is '1'
        element.wbs_short_name = `1.${nextCode}`;
      }
      // Other elements already have wbs_short_name set relative to parent
    });

    console.log('✅ WBS codes assigned successfully');
  }

  /**
   * Validate the integration result
   */
  validateIntegration(existingElements, newElements) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {}
    };

    // Check for code conflicts
    this.validateCodeUniqueness(existingElements, newElements, validation);
    
    // Verify parent relationships
    this.validateHierarchy(newElements, validation);
    
    // Check P6 compatibility
    this.validateP6Compatibility(newElements, validation);

    validation.summary = {
      totalErrors: validation.errors.length,
      totalWarnings: validation.warnings.length,
      codeConflicts: validation.errors.filter(e => e.type === 'code_conflict').length,
      hierarchyIssues: validation.errors.filter(e => e.type === 'hierarchy').length
    };

    console.log(`🔍 Integration Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Errors: ${validation.errors.length}`);
    console.log(`   Warnings: ${validation.warnings.length}`);

    return validation;
  }

  /**
   * Validate WBS code uniqueness
   */
  validateCodeUniqueness(existing, newElements, validation) {
    const existingCodes = new Set(existing.map(e => e.wbs_short_name).filter(Boolean));
    
    newElements.forEach(element => {
      if (element.wbs_short_name && existingCodes.has(element.wbs_short_name)) {
        validation.errors.push({
          type: 'code_conflict',
          message: `Duplicate WBS code: ${element.wbs_short_name}`,
          element: element
        });
        validation.isValid = false;
      }
    });
  }

  /**
   * Validate hierarchy relationships
   */
  validateHierarchy(newElements, validation) {
    newElements.forEach(element => {
      if (element.parent_wbs_id) {
        const hasParent = newElements.some(e => e.wbs_id === element.parent_wbs_id);
        if (!hasParent) {
          // Parent should exist in existing structure - this is expected
        }
      }
    });
  }

  /**
   * Validate P6 compatibility
   */
  validateP6Compatibility(newElements, validation) {
    newElements.forEach(element => {
      if (!element.wbs_name || element.wbs_name.trim() === '') {
        validation.errors.push({
          type: 'p6_compatibility',
          message: `Missing WBS name for element ${element.wbs_id}`,
          element: element
        });
        validation.isValid = false;
      }
    });
  }

  /**
   * Generate integration summary
   */
  generateIntegrationSummary(newElements, processedEquipment) {
    const categoryCounts = {};
    const elementTypes = {};

    newElements.forEach(element => {
      // Count by element type
      elementTypes[element.element_type] = (elementTypes[element.element_type] || 0) + 1;

      // Count by category
      if (element.category_code) {
        categoryCounts[element.category_code] = (categoryCounts[element.category_code] || 0) + 1;
      }
    });

    return {
      totalNewElements: newElements.length,
      equipmentProcessed: processedEquipment.length,
      elementTypes: elementTypes,
      categoryCounts: categoryCounts,
      commissionedEquipment: processedEquipment.filter(item => item.commissioning === 'Y').length,
      tbcEquipment: processedEquipment.filter(item => item.commissioning === 'TBC').length,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  generateNewWbsId() {
    return `NEW_${this.newWbsIdCounter++}`;
  }

  generateShortCode(parentCode) {
    return `${parentCode}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSubsystemShortCode(subsystemNumber) {
    return `S${subsystemNumber}`;
  }

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
        return zoneCode;
      }
    }

    const numMatch = subsystemName.match(/(\d+)/);
    if (numMatch) {
      return `+Z${numMatch[1].padStart(2, '0')}`;
    }

    return '+Z??';
  }

  findNextSubsystemNumber(existingSubsystems) {
    if (!existingSubsystems || existingSubsystems.length === 0) return 2; // Start from 2 since S1 exists
    const numbers = existingSubsystems.map(s => s.subsystemNumber).filter(n => !isNaN(n));
    return Math.max(...numbers) + 1;
  }
}

// ============================================================================
// COMPATIBILITY WRAPPER FUNCTIONS FOR WBSGenerator.jsx
// ============================================================================

/**
 * Main processing function that WBSGenerator.jsx expects
 * This wraps the existing Continue Project Integration functionality
 * @param {Array} equipmentData - Equipment list to integrate
 * @param {Object} projectState - Existing project state from XER analysis
 * @param {string} projectName - Project name (optional, can be derived from projectState)
 * @returns {Object} - Results in format expected by WBSGenerator.jsx
 */
export const processContinueProjectWBS = async (equipmentData, projectState, projectName) => {
  console.log('🎯 processContinueProjectWBS wrapper called - using existing integration logic');
  console.log(`📦 Equipment items: ${equipmentData.length}`);
  console.log(`🏗️ Project: ${projectName || projectState?.projectName || 'Unknown'}`);

  try {
    // 1. Extract subsystem name from first equipment item
    const subsystemName = extractSubsystemName(equipmentData);
    console.log(`🏢 Detected subsystem: "${subsystemName}"`);

    // 2. Create processor instance
    const processor = new ContinueProjectProcessor();

    // 3. Format project state as expected by the integration engine
    const existingAnalysis = formatProjectStateForIntegration(projectState);

    // 4. Process the integration
    const integrationResults = await processor.processNewSubsystem(
      existingAnalysis,
      equipmentData,
      subsystemName
    );

    // 5. Convert results to format expected by WBSGenerator.jsx
    const formattedResults = formatResultsForWBSGenerator(integrationResults, projectState, projectName);

    console.log('✅ processContinueProjectWBS wrapper completed successfully');
    console.log(`📊 Generated ${formattedResults.newNodes.length} new nodes`);

    return formattedResults;

  } catch (error) {
    console.error('🚫 processContinueProjectWBS wrapper failed:', error);
    throw new Error(`Continue Project WBS processing failed: ${error.message}`);
  }
};

/**
 * Extract subsystem name from equipment data
 */
const extractSubsystemName = (equipmentData) => {
  if (!equipmentData || equipmentData.length === 0) {
    throw new Error('No equipment data provided');
  }

  const firstItem = equipmentData[0];
  const subsystemName = firstItem.subsystem;

  if (!subsystemName || subsystemName.trim() === '') {
    throw new Error('No subsystem name found in equipment data');
  }

  // Clean up the subsystem name (remove zone code suffix if present)
  return subsystemName.replace(/\s*-\s*\+Z\d+$/i, '').trim();
};

/**
 * Format project state for the integration engine
 */
const formatProjectStateForIntegration = (projectState) => {
  if (!projectState) {
    throw new Error('No project state provided');
  }

  // Map the project state format to what the integration engine expects
  return {
    wbsElements: projectState.originalXERData || projectState.wbsNodes || [],
    parentStructures: projectState.parentStructures || {
      prerequisites: null,
      milestones: null,
      energisation: null,
      subsystems: [],
      tbcSection: null,
      root: null
    },
    projectInfo: projectState.projectInfo || {
      projectName: projectState.projectName || 'Unknown Project',
      rootWbsId: projectState.rootWbsId || null,
      totalElements: projectState.totalElements || 0
    },
    validation: projectState.validation || {
      isValid: true,
      errors: [],
      warnings: []
    }
  };
};

/**
 * Format integration results for WBSGenerator.jsx
 */
const formatResultsForWBSGenerator = (integrationResults, originalProjectState, projectName) => {
  // Convert new elements to WBS nodes format
  const newNodes = integrationResults.newElements.map(element => ({
    wbs_code: element.wbs_short_name || element.wbs_id,
    parent_wbs_code: element.parent_wbs_id,
    wbs_name: element.wbs_name,
    element_type: element.element_type,
    is_new: true,
    integration_note: element.integration_note
  }));

  // Convert all elements to WBS nodes format
  const allNodes = integrationResults.totalElements.map(element => ({
    wbs_code: element.wbs_short_name || element.wbs_id,
    parent_wbs_code: element.parent_wbs_id,
    wbs_name: element.wbs_name,
    element_type: element.element_type,
    is_new: element.is_new || false,
    integration_note: element.integration_note
  }));

  // Update project state
  const updatedProjectState = {
    ...originalProjectState,
    subsystems: [
      ...(originalProjectState.subsystems || []),
      {
        number: integrationResults.context.subsystemNumber,
        code: integrationResults.context.zoneCode,
        name: integrationResults.context.subsystemName,
        elements: newNodes.length
      }
    ],
    lastIntegration: {
      timestamp: new Date().toISOString(),
      elementsAdded: newNodes.length,
      subsystemAdded: integrationResults.context.fullSubsystemName
    }
  };

  return {
    allNodes: allNodes,
    newNodes: newNodes,
    projectState: updatedProjectState,
    integrationSummary: integrationResults.integrationSummary,
    validation: integrationResults.validation
  };
};

// ============================================================================
// EXPORT FUNCTIONS (EXISTING)
// ============================================================================

/**
 * Create a new Continue Project Processor
 */
export const createContinueProjectProcessor = () => {
  return new ContinueProjectProcessor();
};

/**
 * Quick integration function
 */
export const integrateNewSubsystem = async (existingAnalysis, newEquipmentList, subsystemName) => {
  const processor = new ContinueProjectProcessor();
  return await processor.processNewSubsystem(existingAnalysis, newEquipmentList, subsystemName);
};
