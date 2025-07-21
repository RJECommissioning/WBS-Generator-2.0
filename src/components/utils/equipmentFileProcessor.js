// src/components/utils/equipmentFileProcessor.js
// Smart subsystem detection from equipment lists - Complete Implementation

import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Smart Equipment File Processor with Auto-Subsystem Detection
 * 
 * Detection Logic:
 * 1. Equipment with Subsystem Listed → Regular equipment belonging to a subsystem
 * 2. Equipment with NO Subsystem + Other equipment lists THIS as their subsystem → This IS the subsystem
 * 
 * Example:
 * | Equipment | Description      | Subsystem |
 * |-----------|------------------|-----------|
 * | +Z02      | Switchroom 2     | (empty)   | ← This is the SUBSYSTEM (others reference it)
 * | +UH201    | Protection Panel | +Z02      | ← This belongs TO the subsystem
 * | +UH202    | Protection Panel | +Z02      | ← This belongs TO the subsystem
 */
export class EquipmentFileProcessor {
  constructor() {
    this.debug = true;
  }

  /**
   * Process equipment file and auto-detect subsystem
   */
  async processEquipmentFile(file) {
    console.log('🔍 Processing equipment file for smart subsystem detection:', file.name);

    try {
      // 1. Read and parse file
      const equipmentData = await this.readEquipmentFile(file);
      console.log(`📊 Parsed ${equipmentData.length} equipment items`);

      // 2. Detect subsystem using smart logic
      const subsystemInfo = this.detectSubsystem(equipmentData);
      
      // 3. Validate detection results
      this.validateDetection(subsystemInfo);

      return {
        subsystemInfo,
        equipmentData,
        totalEquipment: equipmentData.length,
        processedDate: new Date()
      };

    } catch (error) {
      console.error('🚫 Equipment file processing failed:', error);
      throw error;
    }
  }

  /**
   * Read equipment file (Excel or CSV)
   */
  async readEquipmentFile(file) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (['xlsx', 'xls'].includes(fileExtension)) {
      return await this.readExcelFile(file);
    } else if (fileExtension === 'csv') {
      return await this.readCSVFile(file);
    } else {
      throw new Error('Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV file.');
    }
  }

  /**
   * Read Excel file
   */
  async readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Use first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          // Convert to objects with headers
          const equipmentData = this.convertToEquipmentObjects(jsonData);
          resolve(equipmentData);
          
        } catch (error) {
          reject(new Error(`Failed to read Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Read CSV file
   */
  async readCSVFile(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            console.warn('CSV parsing warnings:', result.errors);
            // Only reject on critical errors, not warnings
            const criticalErrors = result.errors.filter(e => e.type === 'Quotes' || e.type === 'FieldMismatch');
            if (criticalErrors.length > 0) {
              reject(new Error(`Critical CSV parsing errors: ${criticalErrors.map(e => e.message).join(', ')}`));
              return;
            }
          }
          const equipmentData = this.normalizeEquipmentData(result.data);
          resolve(equipmentData);
        },
        error: (error) => reject(new Error(`Failed to parse CSV: ${error.message}`))
      });
    });
  }

  /**
   * Convert Excel array data to equipment objects
   */
  convertToEquipmentObjects(arrayData) {
    if (arrayData.length < 2) {
      throw new Error('Equipment file must have headers and at least one data row');
    }

    const headers = arrayData[0].map(h => this.normalizeHeaderName(h));
    const rows = arrayData.slice(1);

    return rows
      .filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== ''))
      .map(row => {
        const equipment = {};
        headers.forEach((header, index) => {
          equipment[header] = row[index] || '';
        });
        return equipment;
      })
      .filter(item => 
        // Filter out completely empty rows
        Object.values(item).some(value => value && value.toString().trim() !== '')
      );
  }

  /**
   * Normalize equipment data from any source
   */
  normalizeEquipmentData(data) {
    return data.map(item => {
      const normalized = {};
      Object.keys(item).forEach(key => {
        const normalizedKey = this.normalizeHeaderName(key);
        normalized[normalizedKey] = item[key] || '';
      });
      return normalized;
    }).filter(item => 
      // Filter out completely empty rows
      Object.values(item).some(value => value && value.toString().trim() !== '')
    );
  }

  /**
   * Normalize header names to standard format
   */
  normalizeHeaderName(header) {
    if (!header) return 'unknown';
    
    const normalized = header.toString().toLowerCase().trim();
    
    // Map common variations to standard names
    const headerMappings = {
      'equipment number': 'equipmentNumber',
      'equipment_number': 'equipmentNumber',
      'equip number': 'equipmentNumber',
      'equip_number': 'equipmentNumber',
      'tag': 'equipmentNumber',
      'tag number': 'equipmentNumber',
      'equipment': 'equipmentNumber',
      
      'description': 'description',
      'desc': 'description',
      'equipment description': 'description',
      'name': 'description',
      
      'subsystem': 'subsystem',
      'sub system': 'subsystem',
      'sub-system': 'subsystem',
      'parent': 'subsystem',
      'parent system': 'subsystem',
      'system': 'subsystem',
      
      'commissioning': 'commissioning',
      'commission': 'commissioning',
      'status': 'commissioning',
      
      'parent equipment number': 'parentEquipmentNumber',
      'parent equipment': 'parentEquipmentNumber',
      'parent_equipment': 'parentEquipmentNumber'
    };

    return headerMappings[normalized] || normalized.replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * SMART SUBSYSTEM DETECTION LOGIC
   * 
   * Core Logic:
   * 1. Find equipment items that are referenced as subsystems by other equipment
   * 2. But have no subsystem parent themselves (or reference themselves)
   * 3. Select the best candidate based on reference count and patterns
   */
  detectSubsystem(equipmentData) {
    console.log('🧠 Starting smart subsystem detection...');

    if (!equipmentData || equipmentData.length === 0) {
      throw new Error('No equipment data found');
    }

    // Step 1: Build subsystem reference map
    const subsystemReferences = this.buildSubsystemReferenceMap(equipmentData);
    
    // Step 2: Find items that are referenced as subsystems but have no parent
    const detectedSubsystems = this.findSubsystemCandidates(equipmentData, subsystemReferences);
    
    // Step 3: Validate and select best subsystem candidate
    const selectedSubsystem = this.selectBestSubsystemCandidate(detectedSubsystems, equipmentData);
    
    if (!selectedSubsystem) {
      throw new Error('Could not detect subsystem from equipment list. Please ensure equipment list includes a Subsystem column with proper references.');
    }

    // Step 4: Extract zone code and build subsystem info
    const subsystemInfo = this.buildSubsystemInfo(selectedSubsystem, equipmentData);
    
    console.log('✅ Subsystem detected successfully:', subsystemInfo);
    return subsystemInfo;
  }

  /**
   * Build map of what equipment references what subsystems
   */
  buildSubsystemReferenceMap(equipmentData) {
    const references = new Map();
    
    equipmentData.forEach(item => {
      const subsystem = this.getSubsystemValue(item);
      if (subsystem) {
        if (!references.has(subsystem)) {
          references.set(subsystem, []);
        }
        references.get(subsystem).push(item);
      }
    });
    
    if (this.debug) {
      console.log('📊 Subsystem reference map:');
      references.forEach((items, subsystem) => {
        console.log(`   "${subsystem}" referenced by ${items.length} items`);
      });
    }
    
    return references;
  }

  /**
   * Find equipment items that are referenced as subsystems but have no parent themselves
   * 
   * Logic: If equipment X is listed as "subsystem" by other equipment,
   * but equipment X itself has no subsystem (or references itself),
   * then equipment X IS the subsystem.
   */
  findSubsystemCandidates(equipmentData, subsystemReferences) {
    const candidates = [];
    
    equipmentData.forEach(item => {
      const equipmentNumber = this.getEquipmentNumber(item);
      const itemSubsystem = this.getSubsystemValue(item);
      
      // Check if this item is referenced by others as their subsystem
      const isReferencedAsSubsystem = subsystemReferences.has(equipmentNumber);
      
      // Check if this item has no subsystem parent (or references itself)
      const hasNoParent = !itemSubsystem || 
                          itemSubsystem === equipmentNumber ||
                          itemSubsystem.trim() === '' ||
                          itemSubsystem.toLowerCase() === 'n/a' ||
                          itemSubsystem.toLowerCase() === 'none';
      
      if (isReferencedAsSubsystem && hasNoParent) {
        const referencingItems = subsystemReferences.get(equipmentNumber) || [];
        candidates.push({
          equipmentItem: item,
          equipmentNumber: equipmentNumber,
          referencedBy: referencingItems,
          referenceCount: referencingItems.length
        });
        
        if (this.debug) {
          console.log(`🎯 Subsystem candidate: "${equipmentNumber}" (${referencingItems.length} references)`);
        }
      }
    });
    
    return candidates;
  }

  /**
   * Select the best subsystem candidate from multiple options
   */
  selectBestSubsystemCandidate(candidates, equipmentData) {
    if (candidates.length === 0) {
      return null;
    }
    
    if (candidates.length === 1) {
      console.log('✅ Single subsystem candidate selected');
      return candidates[0];
    }
    
    // Multiple candidates - select using priority rules:
    // 1. Most references (most equipment belongs to it)
    // 2. Zone code pattern (+Z01, +Z02, etc.)
    // 3. Subsystem naming patterns
    
    let bestCandidate = candidates[0];
    
    for (const candidate of candidates) {
      // Priority 1: More references = better candidate
      if (candidate.referenceCount > bestCandidate.referenceCount) {
        bestCandidate = candidate;
        continue;
      }
      
      // Priority 2: Zone code patterns
      if (candidate.referenceCount === bestCandidate.referenceCount) {
        const candidateHasZoneCode = this.extractZoneCode(candidate.equipmentNumber);
        const bestHasZoneCode = this.extractZoneCode(bestCandidate.equipmentNumber);
        
        if (candidateHasZoneCode && !bestHasZoneCode) {
          bestCandidate = candidate;
        }
      }
    }
    
    console.log(`✅ Best subsystem candidate: "${bestCandidate.equipmentNumber}" (${bestCandidate.referenceCount} references)`);
    return bestCandidate;
  }

  /**
   * Build complete subsystem information from selected candidate
   */
  buildSubsystemInfo(selectedSubsystem, equipmentData) {
    const equipmentItem = selectedSubsystem.equipmentItem;
    const equipmentNumber = selectedSubsystem.equipmentNumber;
    const description = this.getDescription(equipmentItem);
    
    // Build subsystem name from description and equipment number
    const subsystemName = this.buildSubsystemName(description, equipmentNumber);
    
    // Extract zone code
    const zoneCode = this.extractZoneCode(equipmentNumber) || this.extractZoneCode(subsystemName);
    
    // Get equipment belonging to this subsystem
    const subsystemEquipment = selectedSubsystem.referencedBy;
    
    return {
      subsystemName: subsystemName,
      zoneCode: zoneCode,
      equipmentNumber: equipmentNumber,
      description: description,
      equipmentCount: subsystemEquipment.length,
      equipment: subsystemEquipment,
      detectionMethod: 'smart_reference_analysis'
    };
  }

  /**
   * Get subsystem value from equipment item (handles various column names)
   */
  getSubsystemValue(item) {
    const subsystemValue = item.subsystem || 
                          item.parent || 
                          item.parentSystem || 
                          item.system ||
                          '';
    
    // Clean up the value
    return subsystemValue ? subsystemValue.toString().trim() : '';
  }

  /**
   * Get equipment number from equipment item (handles various column names)
   */
  getEquipmentNumber(item) {
    const equipmentNumber = item.equipmentNumber || 
                           item.tag || 
                           item.tagNumber || 
                           item.equipNumber ||
                           item.equipment ||
                           '';
    
    return equipmentNumber ? equipmentNumber.toString().trim() : '';
  }

  /**
   * Get description from equipment item (handles various column names)
   */
  getDescription(item) {
    const description = item.description || 
                       item.desc || 
                       item.equipmentDescription ||
                       item.name ||
                       '';
    
    return description ? description.toString().trim() : '';
  }

  /**
   * Build subsystem name from description and equipment number
   */
  buildSubsystemName(description, equipmentNumber) {
    if (description && equipmentNumber) {
      // Check if description already includes equipment number
      if (description.includes(equipmentNumber)) {
        return description.trim();
      } else {
        return `${description.trim()} - ${equipmentNumber}`;
      }
    } else if (description) {
      return description.trim();
    } else if (equipmentNumber) {
      return equipmentNumber;
    } else {
      return 'Unknown Subsystem';
    }
  }

  /**
   * Extract zone code from text (e.g., +Z02, Z01, etc.)
   * 
   * Patterns supported:
   * - +Z01, +Z02, etc. (preferred format)
   * - Z01, Z02, etc.
   * - Zone01, Zone02, etc.
   * - Z01A, Z02B, etc. (with letter suffix)
   */
  extractZoneCode(text) {
    if (!text) return null;
    
    const zonePatterns = [
      /([+]?Z\d+[A-Z]?)/i,         // +Z01, Z01, Z01A, +Z02B
      /([+]?zone\s*\d+)/i,         // Zone01, +Zone01
      /([+]?z\d+[a-z]?)/i          // z01a, +z02b (case variations)
    ];
    
    for (const pattern of zonePatterns) {
      const match = text.match(pattern);
      if (match) {
        let zoneCode = match[1].toUpperCase();
        // Ensure it starts with + if it's a Z pattern
        if (zoneCode.startsWith('Z') && !zoneCode.startsWith('+Z')) {
          zoneCode = '+' + zoneCode;
        }
        return zoneCode;
      }
    }
    
    return null;
  }

  /**
   * Validate detection results
   */
  validateDetection(subsystemInfo) {
    if (!subsystemInfo) {
      throw new Error('Subsystem detection failed - no subsystem found');
    }
    
    if (!subsystemInfo.subsystemName) {
      throw new Error('Subsystem detection failed - no subsystem name detected');
    }
    
    if (subsystemInfo.equipmentCount === 0) {
      throw new Error('Subsystem detection failed - no equipment found for detected subsystem');
    }
    
    if (!subsystemInfo.zoneCode) {
      console.warn('⚠️ Warning: No zone code detected in subsystem name. This may affect categorization.');
    }
    
    if (this.debug) {
      console.log('✅ Subsystem detection validation passed');
      console.log(`   📊 Subsystem: ${subsystemInfo.subsystemName}`);
      console.log(`   🏢 Zone Code: ${subsystemInfo.zoneCode}`);
      console.log(`   📦 Equipment Count: ${subsystemInfo.equipmentCount}`);
      console.log(`   🔍 Detection Method: ${subsystemInfo.detectionMethod}`);
    }
  }
}

// ============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Main function to process equipment file
 * @param {File} file - Equipment list file (Excel or CSV)
 * @returns {Promise} Processing results with subsystem info
 */
export const processEquipmentFile = async (file) => {
  const processor = new EquipmentFileProcessor();
  return await processor.processEquipmentFile(file);
};

/**
 * Detect subsystem from already parsed equipment data
 * @param {Array} equipmentData - Array of equipment objects
 * @returns {Object} Detected subsystem information
 */
export const detectSubsystemFromData = (equipmentData) => {
  const processor = new EquipmentFileProcessor();
  return processor.detectSubsystem(equipmentData);
};

/**
 * Validate equipment file format without full processing
 * @param {File} file - Equipment list file
 * @returns {Promise<boolean>} Whether file format is supported
 */
export const validateEquipmentFileFormat = (file) => {
  const allowedExtensions = ['xlsx', 'xls', 'csv'];
  const fileExtension = file.name.split('.').pop().toLowerCase();
  return allowedExtensions.includes(fileExtension);
};
