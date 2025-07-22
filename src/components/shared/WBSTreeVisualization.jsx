// src/components/shared/WBSTreeVisualization.jsx - FIXED FLAG DETECTION
// Fixed to properly handle explicit isExisting and isNew flags from ContinueProject.jsx

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

  // Safe string conversion
  const safeString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // FIXED: Enhanced WBS hierarchy building with better flag detection
  const buildProperWBSHierarchy = (nodes) => {
    console.log('🏗️ FIXED: Building WBS hierarchy from', nodes.length, 'nodes');
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return [];
    }
    
    // FIXED: Better flag detection using explicit flags from ContinueProject.jsx
    const normalizedNodes = nodes.map(node => {
      // FIXED: Use explicit flags first, with safer fallbacks
      let isNew = false;
      let isExisting = false;
      
      if (node.isNew === true || node.is_new === true) {
        isNew = true;
        isExisting = false;
      } else if (node.isExisting === true) {
        isExisting = true;
        isNew = false;
      } else {
        // Fallback: if no explicit flags, treat as existing (likely from XER)
        isExisting = true;
        isNew = false;
      }
      
      // WBS Code Priority: existing P6 codes first, then generated codes
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
        wbsCodeParts: wbsCode.split('.').filter(p => p !== ''),
        name: safeString(node.wbs_name || node.name || 'Unnamed'),
        isNew: isNew,
        isExisting: isExisting,
        elementType: safeString(node.element_type || node.elementType || 'unknown'),
        equipmentNumber: safeString(node.equipment_number || ''),
        commissioning: safeString(node.commissioning || ''),
        parentWbsId: safeString(node.parent_wbs_id || ''),
        originalNode: node
      };
      
      normalizedNode.level = normalizedNode.wbsCodeParts.length - 1;
      
      return normalizedNode;
    });

    console.log('📊 FIXED: Flag Analysis:', {
      total: normalizedNodes.length,
      new: normalizedNodes.filter(n => n.isNew).length,
      existing: normalizedNodes.filter(n => n.isExisting).length,
      neither: normalizedNodes.filter(n => !n.isNew && !n.isExisting).length
    });
    
    // Debug: Show sample flags
    console.log('🔍 Sample flagging:');
    normalizedNodes.slice(0, 10).forEach(node => {
      console.log(`   ${node.wbsCode} | ${node.isNew ? 'NEW' : 'EXISTING'} | ${node.name.substring(0, 40)}`);
    });
    
    // FIXED: Build hierarchy using WBS codes
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
        // Root node
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
      }
    });
    
    // Build tree recursively
    const buildNodeTree = (wbsCode) => {
      const node = nodeMap.get(wbsCode);
      if (!node) {
        console.warn(`❌ Node not found for WBS code: ${wbsCode}`);
        return null;
      }
      
      const children = childrenByParent.get(wbsCode) || [];
      
      // Sort children by WBS code naturally
      const sortedChildren = children.sort((a, b) => {
        const aLast = a.wbsCodeParts[a.wbsCodeParts.length - 1];
        const bLast = b.wbsCodeParts[b.wbsCodeParts.length - 1];
        
        const aNum = parseInt(aLast);
        const bNum = parseInt(bLast);
        
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
        children: sortedChildren.map(child => buildNodeTree(child.wbsCode)).filter(Boolean),
        hasChildren: sortedChildren.length > 0
      };
    };
    
    // Start from root nodes
    const rootChildren = childrenByParent.get('ROOT') || [];
    console.log(`🌲 Found ${rootChildren.length} root nodes`);
    
    const trees = rootChildren.map(root => buildNodeTree(root.wbsCode)).filter(Boolean);
    
    console.log(`✅ FIXED: Hierarchy complete - ${trees.length} trees, showing both NEW and EXISTING elements`);
    
    return trees;
  };

  // Build tree structure
  const treeData = useMemo(() => {
    return buildProperWBSHierarchy(wbsNodes);
  }, [wbsNodes]);

  // FIXED: Better filtering logic
  const filteredTreeData = useMemo(() => {
    console.log('🔍 FIXED: Filtering with:', { showOnlyNew, showOnlyExisting });
    
    if (!showOnlyNew && !showOnlyExisting) {
      console.log('📊 Showing ALL elements:', treeData.length);
      return treeData;
    }
    
    const filterNodes = (nodes) => {
      return nodes.reduce((acc, node) => {
        const shouldShowByFlag = showOnlyNew ? node.isNew : showOnlyExisting ? node.isExisting : true;
        const filteredChildren = filterNodes(node.children || []);
        
        // Include node if it matches filter OR has children that match
        if (shouldShowByFlag || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          });
        }
        
        return acc;
      }, []);
    };
    
    const filtered = filterNodes(treeData);
    console.log(`📊 Filtered to ${filtered.length} root nodes`);
    return filtered;
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

  // Enhanced node type detection
  const getNodeType = (node) => {
    const name = node.name.toLowerCase();
    const level = node.level || 0;
    
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
      if (name.match(/^\d{2}\s*\|/)) return 'category';
      return 'structure';
    }
    
    if (level >= 3) {
      if (name.includes('|')) {
        const beforePipe = name.split('|')[0].trim();
        
        // FIXED: Enhanced equipment patterns
        if (beforePipe.match(/^[+-]?UH\d+$/i)) return 'panel';
        if (beforePipe.match(/^-F\d+$/i)) return 'relay';
        if (beforePipe.match(/^-KF\d+$/i)) return 'relay';
        if (beforePipe.match(/^-Y\d+$/i)) return 'relay';
        if (beforePipe.match(/^-P\d+$/i)) return 'relay';
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

  // Get node icon
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

  // FIXED: Better node styling
  const getNodeClasses = (node, nodeType) => {
    let classes = 'flex items-center p-2 rounded border transition-colors ';
    
    // FIXED: Better color coding for new vs existing
    if (node.isNew) {
      classes += 'bg-green-50 border-green-300 ';
    } else if (node.isExisting) {
      classes += 'bg-blue-50 border-blue-200 ';
    } else {
      classes += 'bg-gray-50 border-gray-200 '; // fallback
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

  // FIXED: Enhanced status badges
  const renderStatusBadges = (node, nodeType) => {
    const badges = [];
    
    // FIXED: Clear status badge based on explicit flags
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
    } else {
      badges.push(
        <span key="unknown" className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded">
          UNKNOWN
        </span>
      );
    }
    
    // Type badges
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

  // Tree node component
  const TreeNode = ({ node, level = 0 }) => {
    const nodeType = getNodeType(node);
    const isExpanded = expandedNodes.has(node.wbsCode);
    const nodeClasses = getNodeClasses(node, nodeType);

    return (
      <div key={node.wbsCode} className="mb-1">
        <div
          className={nodeClasses}
          style={{ marginLeft: `${level * 16}px` }}
          onClick={node.hasChildren ? () => toggleExpanded(node.wbsCode) : undefined}
        >
          {getNodeIcon(node, nodeType, isExpanded)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                {safeString(node.wbsCode)}
              </span>
              
              {renderStatusBadges(node, nodeType)}
            </div>
            
            <div className="text-sm mt-2 text-gray-700 font-medium">
              {safeString(node.name)}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              Level {node.level} • Type: {nodeType} • Children: {node.hasChildren ? (node.children?.length || 0) : 0} • {node.isNew ? 'NEW' : 'EXISTING'}
            </div>
          </div>
        </div>

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

  // FIXED: Better statistics calculation
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
        else if (node.isExisting) existingNodes++;
        
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
          🏗️ FIXED WBS Hierarchy ({stats.total} nodes)
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

      {/* FIXED: Enhanced statistics display */}
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
        <strong>FIXED:</strong> 🟦 EXISTING elements from XER • 🟩 NEW equipment integrated • Proper flag detection and hierarchy display
      </div>
    </div>
  );
};

export default WBSTreeVisualization;
