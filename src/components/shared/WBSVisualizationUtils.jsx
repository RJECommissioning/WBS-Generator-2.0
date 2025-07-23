// src/components/shared/WBSVisualizationUtils.jsx - Shared utilities for WBS visualization components

import React from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Settings, 
  Zap, 
  Building2, 
  Package, 
  Wrench,
  CircuitBoard,
  Cpu,
  Database,
  HardDrive,
  Monitor,
  Workflow
} from 'lucide-react';

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

export const rjeColors = {
  lightGreen: '#B8D582',
  mediumGreen: '#7DB544', 
  darkGreen: '#4A9B4B',
  teal: '#2E8B7A',
  blue: '#1E7FC2',
  darkBlue: '#0F5A8F'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Safe string conversion for React rendering
export const safeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Determine node type based on WBS structure patterns
export const getNodeType = (node) => {
  if (!node || !node.name) return 'unknown';
  
  const name = safeString(node.name).toLowerCase();
  const wbsCode = safeString(node.wbsCode);
  
  // Root project node
  if (wbsCode === '1' || name.includes('project')) return 'root';
  
  // Major parent structures
  if (name.includes('milestone')) return 'milestone';
  if (name.includes('pre-requisite') || name.includes('prerequisite')) return 'prerequisite';
  if (name.includes('energisation') || name.includes('energization')) return 'energisation';
  if (name.match(/^s\d+\s*\|/i)) return 'subsystem';
  if (name.includes('tbc') && name.includes('equipment')) return 'tbc';
  
  // Equipment categories (01-10, 99)
  if (name.match(/^\d{2}\s*\|/)) {
    const categoryNumber = name.match(/^(\d{2})\s*\|/)?.[1];
    switch (categoryNumber) {
      case '01': return 'preparation';
      case '02': return 'protection';
      case '03': return 'hv_switchboard';
      case '04': return 'lv_switchboard'; 
      case '05': return 'transformer';
      case '06': return 'battery';
      case '07': return 'earthing';
      case '08': return 'building_services';
      case '09': return 'interface';
      case '10': return 'ancillary';
      case '99': return 'unrecognised';
      default: return 'category';
    }
  }
  
  // Individual equipment items
  if (name.includes('|') && !name.match(/^\d{2}\s*\|/) && !name.match(/^s\d+\s*\|/i)) {
    const equipmentNumber = name.split('|')[0].trim();
    
    // Specific equipment type detection
    if (equipmentNumber.match(/^[+-]?uh/i)) return 'protection_panel';
    if (equipmentNumber.match(/^[+-]?wa/i)) return 'hv_panel';
    if (equipmentNumber.match(/^[+-]?wc/i)) return 'lv_panel';
    if (equipmentNumber.match(/^t\d+/i)) return 'transformer_unit';
    if (equipmentNumber.match(/^[+-]?gb/i)) return 'battery_unit';
    if (equipmentNumber.match(/^e\d+/i)) return 'earthing_unit';
    
    return 'equipment';
  }
  
  // Special items
  if (name === 'test bay' || name === 'panel shop' || name === 'pad') return 'facility';
  if (name === 'phase 1' || name === 'phase 2') return 'phase';
  
  return 'unknown';
};

// Get appropriate icon for node type
export const getNodeIcon = (node, nodeType, isExpanded = false) => {
  const iconProps = { className: "w-4 h-4 mr-2 flex-shrink-0" };
  
  // Expandable nodes show chevron
  if (node.hasChildren) {
    return isExpanded ? 
      <ChevronDown {...iconProps} style={{ color: rjeColors.darkBlue }} /> :
      <ChevronRight {...iconProps} style={{ color: rjeColors.darkBlue }} />;
  }
  
  // Node type specific icons
  switch (nodeType) {
    case 'root': return <Building2 {...iconProps} style={{ color: rjeColors.darkBlue }} />;
    case 'subsystem': return <Workflow {...iconProps} style={{ color: rjeColors.mediumGreen }} />;
    case 'milestone': return <Zap {...iconProps} style={{ color: rjeColors.blue }} />;
    case 'prerequisite': return <Settings {...iconProps} style={{ color: rjeColors.teal }} />;
    case 'energisation': return <Zap {...iconProps} style={{ color: rjeColors.darkGreen }} />;
    case 'category': return <Package {...iconProps} style={{ color: rjeColors.mediumGreen }} />;
    
    // Equipment categories
    case 'protection': return <CircuitBoard {...iconProps} style={{ color: '#dc2626' }} />;
    case 'transformer': return <Database {...iconProps} style={{ color: '#7c2d12' }} />;
    case 'battery': return <HardDrive {...iconProps} style={{ color: '#15803d' }} />;
    case 'hv_switchboard': 
    case 'lv_switchboard': return <Monitor {...iconProps} style={{ color: '#1d4ed8' }} />;
    case 'building_services': return <Building2 {...iconProps} style={{ color: '#7c3aed' }} />;
    case 'ancillary': return <Cpu {...iconProps} style={{ color: '#ea580c' }} />;
    
    // Individual equipment
    case 'protection_panel': return <CircuitBoard {...iconProps} style={{ color: '#dc2626' }} />;
    case 'transformer_unit': return <Database {...iconProps} style={{ color: '#7c2d12' }} />;
    case 'battery_unit': return <HardDrive {...iconProps} style={{ color: '#15803d' }} />;
    case 'hv_panel':
    case 'lv_panel': return <Monitor {...iconProps} style={{ color: '#1d4ed8' }} />;
    case 'equipment': return <Wrench {...iconProps} style={{ color: rjeColors.teal }} />;
    
    case 'facility': return <Building2 {...iconProps} style={{ color: rjeColors.darkGreen }} />;
    case 'phase': return <Workflow {...iconProps} style={{ color: rjeColors.blue }} />;
    case 'tbc': return <Settings {...iconProps} style={{ color: '#f59e0b' }} />;
    
    default: return <Package {...iconProps} style={{ color: rjeColors.mediumGreen }} />;
  }
};

// Get CSS classes for node styling
export const getNodeClasses = (node, nodeType) => {
  const baseClasses = "flex items-start p-3 rounded-lg mb-2 transition-all hover:shadow-md";
  
  // Different background colors by node type
  switch (nodeType) {
    case 'root':
      return `${baseClasses} bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500`;
    
    case 'subsystem':
      return `${baseClasses} bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500`;
      
    case 'milestone':
    case 'prerequisite':
    case 'energisation':
      return `${baseClasses} bg-gradient-to-r from-teal-50 to-teal-100 border-l-4 border-teal-500`;
      
    case 'category':
      return `${baseClasses} bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400`;
      
    case 'equipment':
    case 'protection_panel':
    case 'transformer_unit':
    case 'battery_unit':
    case 'hv_panel':
    case 'lv_panel':
      const isNew = Boolean(node.isNew);
      const isExisting = Boolean(node.isExisting);
      
      if (isNew) {
        return `${baseClasses} bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500`;
      } else if (isExisting) {
        return `${baseClasses} bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500`;
      } else {
        return `${baseClasses} bg-white border border-gray-200`;
      }
      
    case 'tbc':
      return `${baseClasses} bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500`;
      
    default:
      return `${baseClasses} bg-white border border-gray-200`;
  }
};

// ============================================================================
// STATUS BADGE RENDERING
// ============================================================================

export const renderStatusBadges = (node, nodeType) => {
  const badges = [];
  
  // Status badges
  if (node.isNew) {
    badges.push(
      <span key="new" className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">
        NEW
      </span>
    );
  }
  
  if (node.isExisting) {
    badges.push(
      <span key="existing" className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
        EXISTING
      </span>
    );
  }
  
  // Node type badges
  const getNodeTypeBadge = (type) => {
    const badgeMap = {
      'root': { label: 'ROOT', color: 'bg-blue-100 text-blue-800' },
      'subsystem': { label: 'SUBSYSTEM', color: 'bg-green-100 text-green-800' },
      'milestone': { label: 'MILESTONE', color: 'bg-purple-100 text-purple-800' },
      'prerequisite': { label: 'PREREQ', color: 'bg-teal-100 text-teal-800' },
      'energisation': { label: 'ENERGY', color: 'bg-yellow-100 text-yellow-800' },
      'protection': { label: 'PROTECTION', color: 'bg-red-100 text-red-800' },
      'transformer': { label: 'TRANSFORMER', color: 'bg-orange-100 text-orange-800' },
      'battery': { label: 'BATTERY', color: 'bg-green-100 text-green-800' },
      'equipment': { label: 'EQUIPMENT', color: 'bg-gray-100 text-gray-800' },
      'tbc': { label: 'TBC', color: 'bg-yellow-100 text-yellow-800' }
    };
    
    return badgeMap[type] || { label: 'ITEM', color: 'bg-gray-100 text-gray-800' };
  };
  
  const typeBadge = getNodeTypeBadge(nodeType);
  badges.push(
    <span key="type" className={`px-2 py-1 text-xs font-medium rounded-md ${typeBadge.color}`}>
      {typeBadge.label}
    </span>
  );
  
  return (
    <div className="flex gap-2 flex-wrap">
      {badges}
    </div>
  );
};

// ============================================================================
// CONTROL COMPONENTS
// ============================================================================

export const ControlButtons = ({ 
  showOnlyNew, 
  setShowOnlyNew, 
  showOnlyExisting, 
  setShowOnlyExisting, 
  expandAll, 
  collapseAll,
  showNewToggle = true,
  showExistingToggle = true 
}) => (
  <div className="flex gap-2 flex-wrap">
    <button
      onClick={expandAll}
      className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <ChevronDown className="w-4 h-4 mr-1" />
      Expand All
    </button>
    
    <button
      onClick={collapseAll}
      className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <ChevronRight className="w-4 h-4 mr-1" />
      Collapse All
    </button>
    
    {showNewToggle && (
      <button
        onClick={() => setShowOnlyNew(!showOnlyNew)}
        className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
          showOnlyNew 
            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        {showOnlyNew ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
        {showOnlyNew ? 'Show All' : 'New Only'}
      </button>
    )}
    
    {showExistingToggle && (
      <button
        onClick={() => setShowOnlyExisting(!showOnlyExisting)}
        className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
          showOnlyExisting 
            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        {showOnlyExisting ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
        {showOnlyExisting ? 'Show All' : 'Existing Only'}
      </button>
    )}
  </div>
);

// ============================================================================
// STATS DISPLAY COMPONENT
// ============================================================================

export const StatsDisplay = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
        {safeString(stats.total)}
      </div>
      <div className="text-xs text-gray-600">Total Nodes</div>
    </div>
    
    {stats.newNodes > 0 && (
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {safeString(stats.newNodes)}
        </div>
        <div className="text-xs text-gray-600">New</div>
      </div>
    )}
    
    {stats.existingNodes > 0 && (
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {safeString(stats.existingNodes)}
        </div>
        <div className="text-xs text-gray-600">Existing</div>
      </div>
    )}
    
    <div className="text-center">
      <div className="text-2xl font-bold" style={{ color: rjeColors.teal }}>
        {safeString(stats.equipment)}
      </div>
      <div className="text-xs text-gray-600">Equipment</div>
    </div>
    
    {stats.panels > 0 && (
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color: rjeColors.mediumGreen }}>
          {safeString(stats.panels)}
        </div>
        <div className="text-xs text-gray-600">Panels</div>
      </div>
    )}
    
    {stats.relays > 0 && (
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color: rjeColors.darkGreen }}>
          {safeString(stats.relays)}
        </div>
        <div className="text-xs text-gray-600">Relays</div>
      </div>
    )}
  </div>
);

// ============================================================================
// HIERARCHY BUILDING FUNCTIONS
// ============================================================================

// Build standard WBS hierarchy from flat array
export const buildStandardHierarchy = (wbsNodes) => {
  console.log('🏗️ Building standard hierarchy from', wbsNodes.length, 'nodes');
  
  if (!Array.isArray(wbsNodes) || wbsNodes.length === 0) {
    console.warn('⚠️ No WBS nodes provided for hierarchy building');
    return [];
  }
  
  // Create lookup map for fast parent-child matching
  const nodeMap = new Map();
  const processedNodes = [];
  
  // First pass: create all nodes and build lookup map
  wbsNodes.forEach((node, index) => {
    const wbsCode = safeString(node.wbs_code || node.code || index);
    const parentCode = safeString(node.parent_wbs_code || node.parent_code || '');
    const name = safeString(node.wbs_name || node.name || 'Unnamed Node');
    
    const processedNode = {
      wbsCode: wbsCode,
      parentCode: parentCode,
      name: name,
      children: [],
      hasChildren: false,
      isNew: Boolean(node.is_new || node.isNew),
      isExisting: Boolean(node.is_existing || node.isExisting),
      // Preserve original data
      originalData: node
    };
    
    processedNodes.push(processedNode);
    nodeMap.set(wbsCode, processedNode);
  });
  
  console.log('📊 Created', processedNodes.length, 'processed nodes');
  
  // Second pass: build parent-child relationships
  const rootNodes = [];
  
  processedNodes.forEach(node => {
    if (node.parentCode && node.parentCode !== '' && node.parentCode !== node.wbsCode) {
      // Has a parent - try to find it
      const parent = nodeMap.get(node.parentCode);
      if (parent) {
        parent.children.push(node);
        parent.hasChildren = true;
      } else {
        console.warn(`⚠️ Parent not found for node ${node.wbsCode} (parent: ${node.parentCode})`);
        rootNodes.push(node);
      }
    } else {
      // No parent or self-referential - treat as root
      rootNodes.push(node);
    }
  });
  
  console.log('🌳 Built hierarchy with', rootNodes.length, 'root nodes');
  
  // Sort children at each level by WBS code
  const sortChildren = (nodes) => {
    nodes.forEach(node => {
      if (node.hasChildren) {
        node.children.sort((a, b) => {
          // Try numeric sort first (for codes like 1.2.3)
          const aNum = parseFloat(a.wbsCode.replace(/[^\d.]/g, ''));
          const bNum = parseFloat(b.wbsCode.replace(/[^\d.]/g, ''));
          
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          
          // Fall back to string sort
          return a.wbsCode.localeCompare(b.wbsCode);
        });
        
        sortChildren(node.children);
      }
    });
  };
  
  sortChildren(rootNodes);
  
  // Sort root nodes
  rootNodes.sort((a, b) => {
    const aNum = parseFloat(a.wbsCode.replace(/[^\d.]/g, ''));
    const bNum = parseFloat(b.wbsCode.replace(/[^\d.]/g, ''));
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    return a.wbsCode.localeCompare(b.wbsCode);
  });
  
  console.log('✅ Hierarchy building complete');
  
  // Debug output
  console.log('🔍 Sample root nodes:');
  rootNodes.slice(0, 3).forEach(node => {
    console.log(`   ${node.wbsCode}: "${node.name}" (${node.children.length} children)`);
  });
  
  return rootNodes;
};
