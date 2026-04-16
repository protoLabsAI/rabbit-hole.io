#!/usr/bin/env node

/**
 * Check for circular dependencies between @proto packages
 *
 * Ensures proper build order by detecting circular imports.
 * Run this as part of CI/CD pipeline.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Package dependency graph
const deps = new Map();
const packagesDir = path.join(__dirname, "../packages");

// Get all package names
const packages = fs
  .readdirSync(packagesDir)
  .filter((name) => {
    const pkgPath = path.join(packagesDir, name);
    return fs.statSync(pkgPath).isDirectory();
  })
  .map((name) => `@protolabsai/${name}`);

console.log("📦 Analyzing packages:", packages.join(", "));

// Simple glob implementation for TS files
function findTsFiles(dir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (
        entry.isDirectory() &&
        entry.name !== "node_modules" &&
        entry.name !== "dist"
      ) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      ) {
        files.push(fullPath);
      }
    }
  }

  try {
    walk(dir);
  } catch (err) {
    // Directory might not exist
  }

  return files;
}

// Scan each package for @proto imports
packages.forEach((pkgName) => {
  const simpleName = pkgName.replace("@protolabsai/", "");
  const srcDir = path.join(packagesDir, simpleName, "src");

  if (!fs.existsSync(srcDir)) {
    console.log(`⚠️  No src/ directory for ${pkgName}`);
    return;
  }

  const tsFiles = findTsFiles(srcDir);
  const imports = new Set();

  tsFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    const importRegex = /from ['"]@proto\/([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importedPkg = `@protolabsai/${match[1]}`;
      if (packages.includes(importedPkg) && importedPkg !== pkgName) {
        imports.add(importedPkg);
      }
    }
  });

  deps.set(pkgName, Array.from(imports));
});

// Display dependency graph
console.log("\n📊 Dependency Graph:");
deps.forEach((imports, pkgName) => {
  const simpleName = pkgName.replace("@protolabsai/", "");
  if (imports.length > 0) {
    console.log(
      `  ${simpleName} → ${imports.map((i) => i.replace("@protolabsai/", "")).join(", ")}`
    );
  } else {
    console.log(`  ${simpleName} (no deps)`);
  }
});

// Detect circular dependencies using DFS
function findCycle(node, visited, recursionStack, path) {
  visited.add(node);
  recursionStack.add(node);
  path.push(node);

  const children = deps.get(node) || [];

  for (const child of children) {
    if (!visited.has(child)) {
      const cycle = findCycle(child, visited, recursionStack, [...path]);
      if (cycle) return cycle;
    } else if (recursionStack.has(child)) {
      // Found cycle
      const cycleStart = path.indexOf(child);
      return [...path.slice(cycleStart), child];
    }
  }

  recursionStack.delete(node);
  return null;
}

console.log("\n🔍 Checking for circular dependencies...");

let foundCycle = false;
const visited = new Set();

for (const pkg of packages) {
  if (!visited.has(pkg)) {
    const cycle = findCycle(pkg, visited, new Set(), []);
    if (cycle) {
      foundCycle = true;
      console.error(
        "\n❌ CIRCULAR DEPENDENCY DETECTED:\n",
        cycle.map((p) => p.replace("@protolabsai/", "")).join(" → ")
      );
    }
  }
}

if (!foundCycle) {
  console.log("✅ No circular dependencies found");

  // Suggest optimal build order using topological sort
  const buildOrder = topologicalSort(packages, deps);
  console.log(
    "\n📋 Recommended build order:\n ",
    buildOrder.map((p) => p.replace("@protolabsai/", "")).join(" → ")
  );

  // Check against current build order
  const currentOrder = [
    "@protolabsai/types",
    "@protolabsai/icon-system",
    "@protolabsai/database",
    "@protolabsai/utils",
    "@protolabsai/auth",
    "@protolabsai/assets",
    "@protolabsai/llm-tools",
    "@protolabsai/api-utils",
  ];

  const currentSimple = currentOrder.map((p) => p.replace("@protolabsai/", ""));
  const optimalSimple = buildOrder.map((p) => p.replace("@protolabsai/", ""));

  if (JSON.stringify(currentSimple) !== JSON.stringify(optimalSimple)) {
    console.log("\n⚠️  Current build order may not be optimal");
    console.log("   Current:", currentSimple.join(" → "));
    console.log("   Optimal:", optimalSimple.join(" → "));
  } else {
    console.log("\n✅ Build order is optimal");
  }

  process.exit(0);
} else {
  console.error("\n❌ Fix circular dependencies before building");
  process.exit(1);
}

// Topological sort (Kahn's algorithm)
function topologicalSort(nodes, graph) {
  const inDegree = new Map();
  const result = [];
  const queue = [];

  // Initialize in-degree
  nodes.forEach((node) => {
    inDegree.set(node, 0);
  });

  // Calculate in-degree for each node
  graph.forEach((edges, node) => {
    edges.forEach((edge) => {
      if (nodes.includes(edge)) {
        inDegree.set(edge, (inDegree.get(edge) || 0) + 1);
      }
    });
  });

  // Add nodes with no dependencies to queue
  inDegree.forEach((degree, node) => {
    if (degree === 0) {
      queue.push(node);
    }
  });

  // Process queue
  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);

    const children = graph.get(node) || [];
    children.forEach((child) => {
      if (nodes.includes(child)) {
        inDegree.set(child, inDegree.get(child) - 1);
        if (inDegree.get(child) === 0) {
          queue.push(child);
        }
      }
    });
  }

  return result;
}
