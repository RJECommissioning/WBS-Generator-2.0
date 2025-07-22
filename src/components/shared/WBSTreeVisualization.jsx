// src/components/shared/WBSTreeVisualization.jsx - COMPLETE FIX
// 1. Proper WBS code hierarchy for existing P6 items
// 2. Fixed -F equipment categorization and parent-child relationships

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, FileText, Building2, Settings, FolderOpen } from 'lucide-react';

const WBSTreeVisualization = ({ wbsNodes = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyExisting, setShowOnlyExisting] = useState(false);

  const colors = {
    darkBlue: '#1e3a8a',
    darkGreen: '#059669',
    lightGreen: '#10b981',
    teal: '#2e8b7a'
  };

  // CRITICAL: Safe string conversion
  const safeString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // FIXED: Enhanced WBS code extraction and hierarchy building
  const buildProperWBSHierarchy = (nodes) => {
    console.log('🏗️ Building PROPER WBS hierarchy from', nodes.length, 'nodes');
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return [];
    }
    
    // ENHANCED: Better WBS code extraction from different sources
    const normalizedNodes = nodes.map(node => {
      // PRIORITY ORDER for WBS codes:
      // 1. wbs_short_name (P6 decimal codes like "5737.1064.1575.1096")
      // 2. wbs_code (generated codes)
      // 3. fallback to wbs_id
      
      let wbsCode = '';
      if (node.wbs_short_name && node.wbs_short_name !== '') {
        wbsCode = safeString(node.wbs_short_name);
      } else if (node.wbs_code && node.wbs_code !== '') {
        wbsCode = safeString(node.wbs_code);
      } else {
        wbsCode = safeString(node.wbs_id || `temp_${Math.random()}`);
      }
      
      const normalizedNode = {
        id: safeString(node.wbs_id || node.id || `temp_${Math.random()}`),
        wbsCode: wbsCode,
        wbsCodeParts: wbsCode.split('.').filter(p => p !== ''), // Remove empty parts
        name: safeString(node.wbs_name || node.name || 'Unnamed'),
        isNew: Boolean(node.isNew || node.is_new),
        isExisting: Boolean(node.isExisting || (!node.isNew && !node.is_new)),
        elementType: safeString(node.element_type || node.elementType || 'unknown'),
        equipmentNumber: safeString(node.equipment_number || ''),
        commissioning: safeString(node.commissioning || ''),
        originalNode: node
      };
      
      // ENHANCED: Calculate level from WBS code parts
      normalizedNode.level = normalizedNode.wbsCodeParts.length - 1;
      
      return normalizedNode;
    });

    console.log('📊 WBS Code Analysis:');
    console.log('   Sample codes:', normalizedNodes.slice(0, 10).map(n => `${n.wbsCode} (L${n.level}) -> ${n.name.substring(0, 50)}`));
    
    // FIXED: Build proper hierarchy using WBS codes
    const nodeMap = new Map();
    const childrenByParent = new Map();
    
    // First pass - map all nodes
    normalizedNodes.forEach(node => {
      nodeMap.set(node.wbsCode, node);
    });
    
    // Second pass - establish parent-child relationships
    normalizedNodes.forEach(node => {
      const parts = node.wbsCodeParts;
      
      if (parts.length === 1) {
        // This is a root node
        if (!childrenByParent.has('ROOT')) {
          childrenByParent.set('ROOT', []);
        }
        childrenByParent.get('ROOT').push(node);
      } else {
        // Find parent by removing last part
        const parentParts = parts.slice(0, -1);
        const parentCode = parentParts.join('.');
        
        if (!childrenByParent.has(parentCode)) {
          childrenByParent.set(parentCode, []);
        }
        childrenByParent.get(parentCode).push(node);
        
        // Verify parent exists
        if (!nodeMap.has(parentCode)) {
          console.warn(`⚠️ Parent WBS code missing: ${parentCode} for ${node.wbsCode} (${node.name})`);
        }
      }
    });
    
    // FIXED: Build tree recursively
    const buildNodeTree = (wbsCode) => {
      const node = nodeMap.get(wbsCode);
      if (!node) {
        console.warn(`❌ Node not found for WBS code: ${wbsCode}`);
        return null;
      }
      
      const children = childrenByParent.get(wbsCode) || [];
      
      // ENHANCED: Sort children by WBS code naturally (handles both numeric and text parts)
      const sortedChildren = children.sort((a, b) => {
        // First try natural numeric sort
        const aLast = a.wbsCodeParts[a.wbsCodeParts.length - 1];
        const bLast = b.wbsCodeParts[b.wbsCodeParts.length - 1];
        
        const aNum = parseInt(aLast);
        const bNum = parseInt(bLast);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum; // Numeric sort
        }
        
        // Fallback to string sort
        return a.wbsCode.localeCompare(b.wbsCode, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
      });
      
      return {
        ...node,
        children: sortedChildren.map(child => buildNodeTree(child.wbsCode)).filter(Boolean),
        hasChildren: sortedChildren.length > 0
      };
    };
    
    // Start from root nodes
    const rootChildren = childrenByParent.get('ROOT') || [];
    console.log(`🌲 Found ${rootChildren.length} root nodes`);
    
    const trees = rootChildren.map(root => buildNodeTree(root.wbsCode)).filter(Boolean);
    
    console.log(`✅ WBS hierarchy complete: ${trees.length} root trees built`);
    
    return trees;
  };

  // Build tree structure
  const treeData = useMemo(() => {
    return buildProperWBSHierarchy(wbsNodes);
  }, [wbsNodes]);

  // Filter for different view modes
  const filteredTreeData = useMemo(() => {
    if (!showOnlyNew && !showOnlyExisting) return treeData;
    
    const filterNodes = (nodes) => {
      return nodes.reduce((acc, node) => {
        const shouldShow = showOnlyNew ? node.isNew : showOnlyExisting ? node.isExisting : true;
        const filteredChildren = filterNodes(node.children || []);
        
        if (shouldShow || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          });
        }
        
        return acc;
      }, []);
    };
    
    return filterNodes(treeData);
  }, [treeData, showOnlyNew, showOnlyExisting]);

  const toggleExpanded = (wbsCode) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(wbsCode)) {
      newExpanded.delete(wbsCode);
    } else {
      newExpanded.add(wbsCode);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allCodes = new Set(['root']);
    const collectCodes = (nodes) => {
      nodes.forEach(node => {
        if (node.hasChildren) {
          allCodes.add(node.wbsCode);
          collectCodes(node.children);
        }
      });
    };
    collectCodes(filteredTreeData);
    setExpandedNodes(allCodes);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  // ENHANCED: Better node type detection based on WBS patterns and level
  const getNodeType = (node) => {
    const name = node.name.toLowerCase();
    const level = node.level || 0;
    
    // Level-based detection for P6 structure
    if (level === 0) return 'project';
    
    if (level === 1) {
      if (name.includes('pre-requisite') || name.includes('prerequisite')) return 'prerequisite';
      if (name.includes('milestone')) return 'milestone';
      if (name.includes('energisation')) return 'energisation';
      if (name.match(/^S\d+\s*\|/) || name.includes('subsystem')) return 'subsystem';
      if (name.includes('tbc') || name.includes('to be confirmed')) return 'tbc';
      return 'section';
    }
    
    if (level === 2) {
      if (name.match(/^\d{2}\s*\|/)) return 'category'; // 01 |, 02 |, etc.
      return 'structure';
    }
    
    if (level >= 3) {
      // Equipment level detection
      if (name.includes('|')) {
        // Check for equipment patterns
        const beforePipe = name.split('|')[0].trim();
        
        // FIXED: Enhanced patterns for protection panels
        if (beforePipe.match(/^[+-]?UH\d+$/i)) return 'panel'; // +UH101, UH101
        if (beforePipe.match(/^-F\d+$/i)) return 'relay'; // -F102, -F103
        if (beforePipe.match(/^-KF\d+$/i)) return 'relay'; // -KF10
        if (beforePipe.match(/^-Y\d+$/i)) return 'relay'; // -Y110
        if (beforePipe.match(/^-P\d+$/i)) return 'relay'; // Protection relays
        if (beforePipe.match(/^[+-]?WA\d+$/i)) return 'hv_switchboard';
        if (beforePipe.match(/^[+-]?WC\d+$/i)) return 'lv_switchboard';
        if (beforePipe.match(/^T\d+$/i)) return 'transformer';
        if (beforePipe.match(/^[+-]?GB\d+$/i)) return 'battery';
        
        return 'equipment';
      }
      return 'component';
    }
    
    return 'structure';
  };

  // Get node icon based on type
  const getNodeIcon = (node, nodeType, isExpanded) => {
    const iconProps = { className: "w-4 h-4 mr-2" };
    
    if (node.hasChildren) {
      return isExpanded ? 
        <ChevronDown {...iconProps} style={{ color: colors.teal }} /> :
        <ChevronRight {...iconProps} style={{ color: colors.teal }} />;
    }
    
    switch (nodeType) {
      case 'project':
        return <Building2 {...iconProps} style={{ color: colors.darkBlue }} />;
      case 'subsystem':
        return <Building2 {...iconProps} style={{ color: colors.darkGreen }} />;
      case 'panel':
      case 'relay':
      case 'equipment':
      case 'component':
        return <Settings {...iconProps} style={{ color: colors.darkGreen }} />;
      case 'category':
        return <FolderOpen {...iconProps} style={{ color: colors.teal }} />;
      default:
        return <FileText {...iconProps} style={{ color: colors.darkGreen }} />;
    }
  };

  // ENHANCED: Node styling with better level-based colors
  const getNodeClasses = (node, nodeType) => {
    let classes = 'flex items-center p-2 rounded border transition-colors ';
    
    // Base color by new/existing status
    if (node.isNew) {
      classes += 'bg-green-50 border-green-300 ';
    } else {
      classes += 'bg-blue-50 border-blue-200 ';
    }
    
    // Enhanced styling by type and level
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

  // FIXED: Enhanced status badges
  const renderStatusBadges = (node, nodeType) => {
    const badges = [];
    
    // Status badge
    if (node.isNew) {
      badges.push(
        <span key="new" className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded font-medium">
          NEW
        </span>
      );
    } else {
      badges.push(
        <span key="existing" className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded font-medium">
          EXISTING
        </span>
      );
    }
    
    // Type badge for equipment
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
    
    // Commissioning badge
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

  // ENHANCED: Tree node component with better formatting
  const TreeNode = ({ node, level = 0 }) => {
    const nodeType = getNodeType(node);
    const isExpanded = expandedNodes.has(node.wbsCode);
    const nodeClasses = getNodeClasses(node, nodeType);

    return (
      <div key={node.wbsCode} className="mb-1">
        <div
          className={nodeClasses}
          style={{ marginLeft: `${level * 16}px` }} // Reduced indentation
          onClick={node.hasChildren ? () => toggleExpanded(node.wbsCode) : undefined}
        >
          {getNodeIcon(node, nodeType, isExpanded)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* ENHANCED: Prominent WBS code display */}
              <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                {safeString(node.wbsCode)}
              </span>
              
              {renderStatusBadges(node, nodeType)}
            </div>
            
            <div className="text-sm mt-2 text-gray-700 font-medium">
              {safeString(node.name)}
            </div>
            
            {/* DEBUG: Level and type info */}
            <div className="text-xs text-gray-500 mt-1">
              Level {node.level} • Type: {nodeType} • Children: {node.hasChildren ? (node.children?.length || 0) : 0}
            </div>
          </div>
        </div>

        {/* Render children */}
        {node.hasChildren && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.wbsCode} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Calculate statistics
  const stats = useMemo(() => {
    let total = 0;
    let newNodes = 0;
    let existingNodes = 0;
    let equipment = 0;
    let panels = 0;
    let relays = 0;
    
    const countNodes = (nodes) => {
      nodes.forEach(node => {
        total++;
        if (node.isNew) newNodes++;
        else existingNodes++;
        
        const nodeType = getNodeType(node);
        if (nodeType === 'equipment' || nodeType === 'component') equipment++;
        if (nodeType === 'panel') panels++;
        if (nodeType === 'relay') relays++;
        
        if (node.children) countNodes(node.children);
      });
    };
    
    countNodes(treeData);
    
    return { total, newNodes, existingNodes, equipment, panels, relays };
  }, [treeData]);

  if (!Array.isArray(wbsNodes) || wbsNodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkBlue }}>
          WBS Structure Visualization
        </h3>
        <div className="text-center py-8 text-gray-500">
          No WBS structure to display
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold" style={{ color: colors.darkBlue }}>
          🏗️ Proper WBS Hierarchy ({stats.total} nodes)
        </h3>
        
        <div className="flex items-center gap-4">
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
      </div>

      {/* Enhanced statistics */}
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

      {/* Tree rendering */}
      <div className="max-h-96 overflow-y-auto border rounded p-4 bg-gray-50">
        {filteredTreeData.length > 0 ? (
          filteredTreeData.map(node => (
            <TreeNode key={node.wbsCode} node={node} level={0} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No nodes to display with current filters
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <strong>Fixed:</strong> 🔵 EXISTING items properly nested by WBS codes • 🟡 Panels (+UH) with 🟠 Relay children (-F) • Proper P6 hierarchy
      </div>
    </div>
  );
};

export default WBSTreeVisualization;
