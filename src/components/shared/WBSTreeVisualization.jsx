// src/components/shared/WBSTreeVisualization.jsx - WBS CODE-BASED HIERARCHY
// Uses decimal-separated WBS codes for proper P6 hierarchy (5737.1064.1575.1096.1235)

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, FileText, Building2, Settings, FolderOpen } from 'lucide-react';

const WBSTreeVisualization = ({ wbsNodes = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
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

  // FIXED: Build hierarchy using WBS codes instead of parent_wbs_id
  const buildWBSCodeHierarchy = (nodes) => {
    console.log('🏗️ Building WBS hierarchy from decimal codes for', nodes.length, 'nodes');
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return [];
    }
    
    // ENHANCED: Normalize and extract WBS codes
    const normalizedNodes = nodes.map(node => {
      // Get the WBS code - could be in different fields
      const wbsCode = node.wbs_short_name || node.wbs_code || node.code || safeString(node.wbs_id || '');
      
      const normalizedNode = {
        id: safeString(node.wbs_id || node.id || `temp_${Math.random()}`),
        wbsCode: wbsCode, // The decimal code like "5737.1064.1575.1096"
        wbsCodeParts: wbsCode.split('.'), // ["5737", "1064", "1575", "1096"]
        name: safeString(node.wbs_name || node.name || 'Unnamed'),
        isNew: Boolean(node.isNew || node.is_new),
        isExisting: Boolean(node.isExisting || (!node.isNew && !node.is_new)),
        elementType: safeString(node.element_type || node.elementType || 'unknown'),
        equipmentNumber: safeString(node.equipment_number || ''),
        commissioning: safeString(node.commissioning || ''),
        originalNode: node
      };
      
      return normalizedNode;
    });

    console.log('📊 Sample WBS codes found:', normalizedNodes.slice(0, 5).map(n => `${n.wbsCode} -> ${n.name}`));
    
    // FIXED: Build hierarchy based on WBS code depth and relationships
    const nodeMap = new Map();
    const childrenMap = new Map();
    
    // First pass - create maps
    normalizedNodes.forEach(node => {
      nodeMap.set(node.wbsCode, node);
      childrenMap.set(node.wbsCode, []);
    });
    
    // Second pass - establish parent-child relationships based on WBS codes
    normalizedNodes.forEach(node => {
      const parts = node.wbsCodeParts;
      
      if (parts.length > 1) {
        // Find parent by removing the last part
        const parentParts = parts.slice(0, -1);
        const parentCode = parentParts.join('.');
        
        if (childrenMap.has(parentCode)) {
          childrenMap.get(parentCode).push(node);
        } else {
          // Parent doesn't exist - this might be an orphan or root
          console.log(`⚠️ Parent WBS code not found: ${parentCode} for ${node.wbsCode}`);
        }
      }
    });
    
    // FIXED: Build tree recursively starting from shortest WBS codes (roots)
    const buildNodeTree = (wbsCode) => {
      const node = nodeMap.get(wbsCode);
      if (!node) return null;
      
      const children = childrenMap.get(wbsCode) || [];
      
      // Sort children by WBS code naturally
      const sortedChildren = children.sort((a, b) => {
        return a.wbsCode.localeCompare(b.wbsCode, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
      });
      
      return {
        ...node,
        children: sortedChildren.map(child => buildNodeTree(child.wbsCode)).filter(Boolean),
        hasChildren: sortedChildren.length > 0,
        level: node.wbsCodeParts.length - 1 // Calculate level from WBS code depth
      };
    };
    
    // Find root nodes (shortest WBS codes)
    const rootNodes = normalizedNodes
      .filter(node => {
        // Root nodes are those where no other node has a shorter WBS code that this one starts with
        return !normalizedNodes.some(other => 
          other.wbsCode !== node.wbsCode && 
          node.wbsCode.startsWith(other.wbsCode + '.')
        );
      })
      .sort((a, b) => a.wbsCode.localeCompare(b.wbsCode, undefined, { numeric: true }));
    
    console.log(`🌲 Found ${rootNodes.length} root nodes:`, rootNodes.map(n => `${n.wbsCode} (${n.name})`));
    
    const trees = rootNodes.map(root => buildNodeTree(root.wbsCode)).filter(Boolean);
    
    console.log(`✅ WBS Code hierarchy built: ${trees.length} trees`);
    
    return trees;
  };

  // Build tree structure using WBS codes
  const treeData = useMemo(() => {
    return buildWBSCodeHierarchy(wbsNodes);
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
    const allCodes = new Set();
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
    setExpandedNodes(new Set());
  };

  // Get node type for styling
  const getNodeType = (node) => {
    const name = node.name.toLowerCase();
    const level = node.level || 0;
    
    // ENHANCED: Detect node type by WBS level and name patterns
    if (level === 0) return 'project';
    if (level === 1) {
      if (name.includes('pre-requisite') || name.includes('prerequisite')) return 'prerequisite';
      if (name.includes('milestone')) return 'milestone';
      if (name.includes('energisation')) return 'energisation';
      if (name.match(/^S\d+\s*\|/)) return 'subsystem';
      return 'section';
    }
    if (level === 2) {
      if (name.match(/^\d{2}\s*\|/)) return 'category';
      return 'structure';
    }
    if (level >= 3) {
      // Equipment level - check for patterns
      if (name.includes('|') && !name.match(/^\d{2}\s*\|/)) return 'equipment';
      return 'component';
    }
    
    return 'structure';
  };

  // Get node icon based on type and state
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
      case 'equipment':
      case 'component':
        return <Settings {...iconProps} style={{ color: colors.darkGreen }} />;
      case 'category':
        return <FolderOpen {...iconProps} style={{ color: colors.teal }} />;
      default:
        return <FileText {...iconProps} style={{ color: colors.darkGreen }} />;
    }
  };

  // ENHANCED: Get node styling with level-based indentation
  const getNodeClasses = (node, nodeType) => {
    let classes = 'flex items-center p-2 rounded border transition-colors ';
    
    // Color by new/existing status
    if (node.isNew) {
      classes += 'bg-green-50 border-green-300 ';
    } else {
      classes += 'bg-blue-50 border-blue-200 ';
    }
    
    // Special styling for different levels
    if (nodeType === 'project') {
      classes += 'bg-gray-100 border-gray-400 text-gray-900 font-bold ';
    } else if (nodeType === 'subsystem') {
      if (node.isNew) {
        classes += 'bg-green-100 border-green-400 text-green-900 font-semibold ';
      } else {
        classes += 'bg-blue-100 border-blue-400 text-blue-900 font-semibold ';
      }
    } else if (nodeType === 'category') {
      classes += 'bg-purple-50 border-purple-300 ';
    } else if (nodeType === 'equipment') {
      classes += 'text-gray-800 ';
    }
    
    if (node.hasChildren) {
      classes += 'cursor-pointer hover:bg-gray-100 ';
    }
    
    return classes;
  };

  // Render status badges
  const renderStatusBadges = (node) => {
    const badges = [];
    
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

  // ENHANCED: Tree node component with WBS code-based rendering
  const TreeNode = ({ node, level = 0 }) => {
    const nodeType = getNodeType(node);
    const isExpanded = expandedNodes.has(node.wbsCode);
    const nodeClasses = getNodeClasses(node, nodeType);

    return (
      <div key={node.wbsCode} className="mb-1">
        <div
          className={nodeClasses}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={node.hasChildren ? () => toggleExpanded(node.wbsCode) : undefined}
        >
          {getNodeIcon(node, nodeType, isExpanded)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* ENHANCED: Show WBS code prominently */}
              <span className="font-mono text-sm font-medium text-gray-800">
                {safeString(node.wbsCode)}
              </span>
              
              {renderStatusBadges(node)}
            </div>
            
            <div className="text-sm mt-1 text-gray-700">
              {safeString(node.name)}
            </div>
            
            {/* DEBUG: Show level info */}
            <div className="text-xs text-gray-500 mt-1">
              Level {node.level || 0} • {nodeType}
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
    let categories = 0;
    
    const countNodes = (nodes) => {
      nodes.forEach(node => {
        total++;
        if (node.isNew) newNodes++;
        if (node.isExisting || !node.isNew) existingNodes++;
        
        const nodeType = getNodeType(node);
        if (nodeType === 'equipment' || nodeType === 'component') equipment++;
        if (nodeType === 'category') categories++;
        
        if (node.children) countNodes(node.children);
      });
    };
    
    countNodes(treeData);
    
    return { total, newNodes, existingNodes, equipment, categories };
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
          📊 WBS Structure by Code Hierarchy ({stats.total} nodes)
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

      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Nodes</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-800">{stats.existingNodes}</div>
          <div className="text-sm text-blue-600">Existing (P6)</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-800">{stats.newNodes}</div>
          <div className="text-sm text-green-600">New Items</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded">
          <div className="text-2xl font-bold text-purple-800">{stats.equipment}</div>
          <div className="text-sm text-purple-600">Equipment</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded">
          <div className="text-2xl font-bold text-orange-800">{stats.categories}</div>
          <div className="text-sm text-orange-600">Categories</div>
        </div>
      </div>

      {/* Tree rendering with debug info */}
      <div className="max-h-96 overflow-y-auto border rounded p-4">
        {filteredTreeData.length > 0 ? (
          filteredTreeData.map(node => (
            <TreeNode key={node.wbsCode} node={node} level={0} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {showOnlyNew ? 'No new nodes to display' : showOnlyExisting ? 'No existing nodes to display' : 'No nodes to display'}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <strong>Legend:</strong> 🔵 EXISTING = From P6 • 🟢 NEW = Just Integrated • Hierarchy based on decimal WBS codes
      </div>
    </div>
  );
};

export default WBSTreeVisualization;
