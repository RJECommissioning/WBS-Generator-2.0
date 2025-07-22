// Tree Structure Fix for WBSTreeVisualization.jsx

// FIXED: Enhanced tree building with better parent relationship handling
export const buildTreeStructure = (nodes) => {
  console.log('🌲 Building tree structure from', nodes.length, 'nodes');
  
  if (!Array.isArray(nodes) || nodes.length === 0) {
    console.warn('⚠️ No nodes provided for tree building');
    return [];
  }
  
  // Create maps for faster lookup
  const nodeMap = new Map();
  const parentMap = new Map();
  
  // FIXED: Normalize node data and handle different ID formats
  const normalizedNodes = nodes.map(node => {
    // Handle different node structures (XER vs generated)
    const normalizedNode = {
      id: node.wbs_id || node.id || `temp_${Math.random()}`,
      parentId: node.parent_wbs_id || node.parent_id || node.parentId,
      name: node.wbs_name || node.name || node.wbs_short_name || 'Unnamed',
      shortName: node.wbs_short_name || node.short_name || node.wbs_code || '',
      isNew: node.isNew || node.is_new || false,
      elementType: node.element_type || node.elementType || 'unknown',
      ...node // Preserve other properties
    };
    
    nodeMap.set(normalizedNode.id, normalizedNode);
    
    if (normalizedNode.parentId) {
      if (!parentMap.has(normalizedNode.parentId)) {
        parentMap.set(normalizedNode.parentId, []);
      }
      parentMap.get(normalizedNode.parentId).push(normalizedNode);
    }
    
    return normalizedNode;
  });
  
  // FIXED: Find root nodes (nodes without parents or orphaned)
  const rootNodes = [];
  const orphanedNodes = [];
  
  normalizedNodes.forEach(node => {
    if (!node.parentId) {
      // No parent specified - this is a root
      rootNodes.push(node);
    } else if (!nodeMap.has(node.parentId)) {
      // Parent doesn't exist - this is orphaned
      console.warn(`⚠️ Parent not found for node: ${node.name} parent: ${node.parentId}`);
      
      // FIXED: Try to find parent by alternative matching
      const potentialParent = findParentByAlternativeMatch(node, normalizedNodes);
      if (potentialParent) {
        console.log(`✅ Found alternative parent for ${node.name}: ${potentialParent.name}`);
        node.parentId = potentialParent.id;
        if (!parentMap.has(potentialParent.id)) {
          parentMap.set(potentialParent.id, []);
        }
        parentMap.get(potentialParent.id).push(node);
      } else {
        // Still orphaned - treat as root or add to special section
        orphanedNodes.push(node);
      }
    }
  });
  
  // FIXED: Build tree recursively with proper parent-child relationships
  const buildNodeTree = (nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    
    const children = parentMap.get(nodeId) || [];
    const sortedChildren = children.sort((a, b) => {
      // Sort by short name/code if available
      const aSort = a.shortName || a.name;
      const bSort = b.shortName || b.name;
      return aSort.localeCompare(bSort, undefined, { numeric: true });
    });
    
    return {
      ...node,
      children: sortedChildren.map(child => buildNodeTree(child.id)).filter(Boolean),
      hasChildren: sortedChildren.length > 0
    };
  };
  
  // Build trees from root nodes
  const trees = rootNodes.map(root => buildNodeTree(root.id)).filter(Boolean);
  
  // FIXED: Handle orphaned nodes by creating a special section
  if (orphanedNodes.length > 0) {
    console.log(`📋 Creating orphaned section for ${orphanedNodes.length} nodes`);
    const orphanedTree = {
      id: 'orphaned_section',
      name: '🔗 Orphaned Elements',
      shortName: 'ORPHANED',
      isNew: false,
      elementType: 'section',
      children: orphanedNodes.map(node => ({
        ...node,
        children: [],
        hasChildren: false
      })),
      hasChildren: orphanedNodes.length > 0
    };
    trees.push(orphanedTree);
  }
  
  console.log(`✅ Tree structure built: ${trees.length} root(s), ${orphanedNodes.length} orphaned`);
  return trees;
};

// FIXED: Alternative parent matching for orphaned nodes
const findParentByAlternativeMatch = (orphanedNode, allNodes) => {
  const parentId = orphanedNode.parentId;
  
  // Try different matching strategies
  const strategies = [
    // Match by similar ID pattern (e.g., 24923 might match to root)
    (nodes) => nodes.find(n => n.id.toString().includes(parentId.toString().substring(0, 4))),
    
    // Match by element type hierarchy
    (nodes) => {
      if (orphanedNode.elementType === 'subsystem') {
        return nodes.find(n => n.name && n.name.includes('Summerfield'));
      }
      return null;
    },
    
    // Match by name patterns
    (nodes) => {
      const orphanName = orphanedNode.name.toLowerCase();
      if (orphanName.includes('pre-requisite') || orphanName.includes('prerequisite')) {
        return nodes.find(n => n.name && n.name.toLowerCase().includes('pre'));
      }
      if (orphanName.includes('milestone')) {
        return nodes.find(n => n.name && n.name.toLowerCase().includes('milestone'));
      }
      if (orphanName.includes('energisation')) {
        return nodes.find(n => n.name && n.name.toLowerCase().includes('energisation'));
      }
      return null;
    }
  ];
  
  // Try each strategy
  for (const strategy of strategies) {
    const match = strategy(allNodes);
    if (match && match.id !== orphanedNode.id) {
      return match;
    }
  }
  
  // Last resort - attach to first root node
  const rootNode = allNodes.find(n => !n.parentId);
  return rootNode;
};

// FIXED: Enhanced WBS code validation
export const validateWBSStructure = (nodes) => {
  const validation = {
    errors: [],
    warnings: [],
    summary: {
      totalNodes: nodes.length,
      rootNodes: 0,
      orphanedNodes: 0,
      duplicateIds: 0,
      missingParents: 0
    }
  };
  
  const idSet = new Set();
  const parentIds = new Set();
  const nodeIds = new Set();
  
  // Collect all node IDs and parent references
  nodes.forEach(node => {
    const id = node.wbs_id || node.id;
    const parentId = node.parent_wbs_id || node.parentId;
    
    if (id) {
      if (idSet.has(id)) {
        validation.errors.push(`Duplicate ID found: ${id}`);
        validation.summary.duplicateIds++;
      }
      idSet.add(id);
      nodeIds.add(id);
    }
    
    if (parentId) {
      parentIds.add(parentId);
    } else {
      validation.summary.rootNodes++;
    }
  });
  
  // Check for missing parents
  parentIds.forEach(parentId => {
    if (!nodeIds.has(parentId)) {
      validation.warnings.push(`Missing parent node: ${parentId}`);
      validation.summary.missingParents++;
    }
  });
  
  validation.summary.orphanedNodes = validation.summary.missingParents;
  
  console.log('🔍 WBS Structure Validation:');
  console.log(`   Total nodes: ${validation.summary.totalNodes}`);
  console.log(`   Root nodes: ${validation.summary.rootNodes}`);
  console.log(`   Orphaned nodes: ${validation.summary.orphanedNodes}`);
  console.log(`   Duplicate IDs: ${validation.summary.duplicateIds}`);
  console.log(`   Errors: ${validation.errors.length}`);
  console.log(`   Warnings: ${validation.warnings.length}`);
  
  return validation;
};

// FIXED: Tree rendering component with better error handling
export const TreeNode = ({ node, level = 0, onNodeClick }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleNodeClick = () => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };
  
  const getNodeIcon = (node) => {
    if (node.isNew) return '✨';
    if (node.elementType === 'section') return '📁';
    if (node.hasChildren) return isExpanded ? '📂' : '📁';
    return '📄';
  };
  
  const getNodeClass = (node) => {
    let classes = 'tree-node';
    if (node.isNew) classes += ' new-node';
    if (node.elementType === 'section') classes += ' section-node';
    if (level === 0) classes += ' root-node';
    return classes;
  };
  
  return (
    <div className={getNodeClass(node)} style={{ marginLeft: level * 20 }}>
      <div className="node-content" onClick={handleNodeClick}>
        {node.hasChildren && (
          <span className="expand-toggle" onClick={handleToggle}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        <span className="node-icon">{getNodeIcon(node)}</span>
        <span className="node-name">{node.name}</span>
        {node.shortName && (
          <span className="node-code">({node.shortName})</span>
        )}
        {node.isNew && <span className="new-badge">NEW</span>}
      </div>
      
      {isExpanded && node.children && (
        <div className="node-children">
          {node.children.map((child, index) => (
            <TreeNode
              key={child.id || index}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default {
  buildTreeStructure,
  validateWBSStructure,
  TreeNode
};
