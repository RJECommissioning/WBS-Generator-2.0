// src/components/shared/WBSVisualizationUtils.js - Shared utilities for all WBS visualizations

import React from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, FileText, Building2, Settings, FolderOpen } from 'lucide-react';

// RJE Corporate Colors
export const rjeColors = {
  lightGreen: '#B8D582',
  mediumGreen: '#7DB544', 
  darkGreen: '#4A9B4B',
  teal: '#2E8B7A',
  blue: '#1E7FC2',
  darkBlue: '#0F5A8F'
};

// Safe string conversion for React rendering
export const safeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Enhanced node type detection based on WBS patterns
export const getNodeType = (node) => {
  const name = (node.wbs_name || node.name || '').toLowerCase();
  const wbsCode = node.wbs_code || node.wbsCode || '';
  
  // Project root detection
  if (name.includes('summerfield') || wbsCode === '1' || wbsCode.match(/^\d{4}$/)) {
    return 'project';
  }
  
  // Structural elements
  if (name.includes('pre-requisite') || name.includes('prerequisite')) return 'prerequisite';
  if (name.includes('milestone')) return 'milestone';
  if (name.includes('energisation')) return 'energisation';
  if (name.match(/^S\d+\s*\|/) || name.includes('subsystem')) return 'subsystem';
  if (name.includes('tbc') || name.includes('to be confirmed')) return 'tbc';
  
  // Category detection (01 |, 02 |, etc.)
  if (name.match(/^\d{2}\s*\|/)) return 'category';
  
  // Equipment type detection based on patterns
  if (name.includes('|')) {
    const beforePipe = name.split('|')[0].trim();
    
    if (beforePipe.match(/^[+-]?UH\d+$/i)) return 'panel';
    if (beforePipe.match(/^-F\d+/i)) return 'relay';
    if (beforePipe.match(/^-KF\d+$/i)) return 'relay';
    if (beforePipe.match(/^-Y\d+$/i)) return 'relay';
    if (beforePipe.match(/^-P\d+$/i)) return 'relay';
    if (beforePipe.match(/^[+-]?WA\d+$/i)) return 'hv_switchboard';
    if (beforePipe.match(/^[+-]?WC\d+$/i)) return 'lv_switchboard';
    if (beforePipe.match(/^T\d+$/i)) return 'transformer';
    if (beforePipe.match(/^[+-]?GB\d+$/i)) return 'battery';
    
    return 'equipment';
  }
  
  return 'structure';
};

// Get appropriate icon for node type
export const getNodeIcon = (node, nodeType, isExpanded) => {
  const iconProps = { className: "w-4 h-4 mr-2" };
  
  if (node.hasChildren) {
    return isExpanded ? 
      <ChevronDown {...iconProps} style={{ color: rjeColors.teal }} /> :
      <ChevronRight {...iconProps} style={{ color: rjeColors.teal }} />;
  }
  
  switch (nodeType) {
    case 'project':
      return <Building2 {...iconProps} style={{ color: rjeColors.darkBlue }} />;
    case 'subsystem':
      return <Building2 {...iconProps} style={{ color: rjeColors.darkGreen }} />;
    case 'panel':
    case 'relay':
    case 'equipment':
      return <Settings {...iconProps} style={{ color: rjeColors.darkGreen }} />;
    case 'category':
      return <FolderOpen {...iconProps} style={{ color: rjeColors.teal }} />;
    default:
      return <FileText {...iconProps} style={{ color: rjeColors.darkGreen }} />;
  }
};

// Get CSS classes for node styling based on type and status
export const getNodeClasses = (node, nodeType) => {
  let classes = 'flex items-center p-2 rounded border transition-colors ';
  
  // Base styling based on new/existing status
  if (node.isNew) {
    classes += 'bg-green-50 border-green-300 ';
  } else if (node.isExisting) {
    classes += 'bg-blue-50 border-blue-200 ';
  } else {
    classes += 'bg-gray-50 border-gray-200 ';
  }
  
  // Type-specific styling
  if (nodeType === 'project') {
    classes += 'bg-gray-100 border-gray-400 text-gray-900 font-bold text-lg ';
  } else if (nodeType === 'subsystem') {
    if (node.isNew) {
      classes += 'bg-green-100 border-green-400 text-green-900 font-semibold ';
    } else {
      classes += 'bg-blue-100 border-blue-400 text-blue-900 font-semibold ';
    }
  } else if (nodeType === 'category') {
    classes += 'bg-purple-50 border-purple-300 font-medium ';
  } else if (nodeType === 'panel') {
    classes += 'bg-yellow-50 border-yellow-300 font-medium ';
  } else if (nodeType === 'relay') {
    classes += 'bg-orange-50 border-orange-300 ';
  }
  
  if (node.hasChildren) {
    classes += 'cursor-pointer hover:bg-gray-100 ';
  }
  
  return classes;
};

// Render status badges for nodes
export const renderStatusBadges = (node, nodeType) => {
  const badges = [];
  
  if (node.isNew) {
    badges.push(
      <span key="new" className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded font-medium">
        NEW
      </span>
    );
  } else if (node.isExisting) {
    badges.push(
      <span key="existing" className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded font-medium">
        EXISTING
      </span>
    );
  }
  
  if (nodeType === 'panel') {
    badges.push(
      <span key="panel" className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">
        PANEL
      </span>
    );
  } else if (nodeType === 'relay') {
    badges.push(
      <span key="relay" className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded">
        RELAY
      </span>
    );
  }
  
  if (node.commissioning) {
    badges.push(
      <span key="commissioning" className={`px-2 py-1 text-xs rounded font-medium ${
        node.commissioning === 'Y' 
          ? 'bg-green-100 text-green-700'
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        {safeString(node.commissioning)}
      </span>
    );
  }
  
  return badges;
};

// Control buttons for expand/collapse and filtering
export const ControlButtons = ({ 
  showOnlyNew, 
  setShowOnlyNew, 
  showOnlyExisting, 
  setShowOnlyExisting,
  expandAll, 
  collapseAll,
  showNewToggle = false,
  showExistingToggle = false 
}) => (
  <div className="flex items-center gap-4">
    {showNewToggle && (
      <button
        onClick={() => {
          setShowOnlyNew(!showOnlyNew);
          setShowOnlyExisting(false);
        }}
        className={`flex items-center px-3 py-2 rounded text-sm transition-colors ${
          showOnlyNew 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {showOnlyNew ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
        {showOnlyNew ? 'Show All' : 'New Only'}
      </button>
    )}

    {showExistingToggle && (
      <button
        onClick={() => {
          setShowOnlyExisting(!showOnlyExisting);
          setShowOnlyNew(false);
        }}
        className={`flex items-center px-3 py-2 rounded text-sm transition-colors ${
          showOnlyExisting 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {showOnlyExisting ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
        {showOnlyExisting ? 'Show All' : 'Existing Only'}
      </button>
    )}
    
    <button
      onClick={expandAll}
      className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
    >
      Expand All
    </button>
    
    <button
      onClick={collapseAll}
      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
    >
      Collapse All
    </button>
  </div>
);

// Statistics display component
export const StatsDisplay = ({ stats }) => (
  <div className="grid grid-cols-6 gap-4 mb-6">
    <div className="text-center p-3 bg-gray-50 rounded">
      <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
      <div className="text-sm text-gray-600">Total</div>
    </div>
    <div className="text-center p-3 bg-blue-50 rounded">
      <div className="text-2xl font-bold text-blue-800">{stats.existingNodes}</div>
      <div className="text-sm text-blue-600">Existing</div>
    </div>
    <div className="text-center p-3 bg-green-50 rounded">
      <div className="text-2xl font-bold text-green-800">{stats.newNodes}</div>
      <div className="text-sm text-green-600">New</div>
    </div>
    <div className="text-center p-3 bg-yellow-50 rounded">
      <div className="text-2xl font-bold text-yellow-800">{stats.panels}</div>
      <div className="text-sm text-yellow-600">Panels</div>
    </div>
    <div className="text-center p-3 bg-orange-50 rounded">
      <div className="text-2xl font-bold text-orange-800">{stats.relays}</div>
      <div className="text-sm text-orange-600">Relays</div>
    </div>
    <div className="text-center p-3 bg-purple-50 rounded">
      <div className="text-2xl font-bold text-purple-800">{stats.equipment}</div>
      <div className="text-sm text-purple-600">Equipment</div>
    </div>
  </div>
);

// Build hierarchy from parent-child relationships (standard StartNew/Missing pattern)
export const buildStandardHierarchy = (nodes) => {
  console.log('🏗️ Building standard hierarchy from', nodes.length, 'nodes');
  
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return [];
  }
  
  // Normalize nodes
  const normalizedNodes = nodes.map(node => ({
    id: safeString(node.wbs_code || node.id),
    wbsCode: safeString(node.wbs_code || ''),
    wbsId: safeString(node.wbs_code || node.wbs_id || ''),
    parentWbsCode: safeString(node.parent_wbs_code || ''),
    name: safeString(node.wbs_name || node.name || 'Unnamed'),
    isNew: node.isNew === true,
    isExisting: node.isExisting === true || !node.isNew,
    hasChildren: false,
    children: [],
    originalNode: node
  }));
  
  console.log('📊 Normalized nodes:', normalizedNodes.length);
  
  // Create maps
  const nodeMap = new Map();
  const childrenMap = new Map();
  
  normalizedNodes.forEach(node => {
    nodeMap.set(node.wbsCode, node);
  });
  
  // Build parent-child relationships
  let rootCount = 0;
  let childCount = 0;
  
  normalizedNodes.forEach(node => {
    const parentCode = node.parentWbsCode;
    
    if (!parentCode || parentCode === '' || parentCode === 'null') {
      // Root node
      if (!childrenMap.has('ROOT')) {
        childrenMap.set('ROOT', []);
      }
      childrenMap.get('ROOT').push(node);
      rootCount++;
    } else {
      // Child node
      if (!childrenMap.has(parentCode)) {
        childrenMap.set(parentCode, []);
      }
      childrenMap.get(parentCode).push(node);
      childCount++;
    }
  });
  
  console.log(`📊 Hierarchy: ${rootCount} roots, ${childCount} children`);
  
  // Build tree recursively
  const buildTree = (nodeCode) => {
    const node = nodeMap.get(nodeCode);
    if (!node) return null;
    
    const children = childrenMap.get(nodeCode) || [];
    
    // Sort children by WBS code
    const sortedChildren = children.sort((a, b) => {
      const aNum = parseInt(a.wbsCode);
      const bNum = parseInt(b.wbsCode);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      
      return a.wbsCode.localeCompare(b.wbsCode, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
    });
    
    return {
      ...node,
      children: sortedChildren.map(child => buildTree(child.wbsCode)).filter(Boolean),
      hasChildren: sortedChildren.length > 0
    };
  };
  
  // Build trees from root nodes
  const rootNodes = childrenMap.get('ROOT') || [];
  const trees = rootNodes
    .map(root => buildTree(root.wbsCode))
    .filter(Boolean);
  
  console.log(`✅ Built ${trees.length} root trees`);
  
  return trees;
};
