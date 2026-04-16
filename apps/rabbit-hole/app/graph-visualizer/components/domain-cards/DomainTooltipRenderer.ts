/**
 * Domain Tooltip Renderer - Simple HTML Generation
 *
 * Follows the Atlas pattern of creating simple HTML tooltips,
 * but generates domain-specific content without React complexity.
 * Uses actual domain metadata and schemas from @protolabsai/types.
 */

import {
  EntitySchemaRegistry,
  // Domain metadata for UI configuration
  BIOLOGICAL_DOMAIN_INFO,
  SOCIAL_DOMAIN_INFO,
  MEDICAL_DOMAIN_INFO,
  TECHNOLOGY_DOMAIN_INFO,
  GEOGRAPHIC_DOMAIN_INFO,
  ECONOMIC_DOMAIN_INFO,
  ACADEMIC_DOMAIN_INFO,
  LEGAL_DOMAIN_INFO,
  CULTURAL_DOMAIN_INFO,
  INFRASTRUCTURE_DOMAIN_INFO,
  TRANSPORTATION_DOMAIN_INFO,
  ASTRONOMICAL_DOMAIN_INFO,
} from "@protolabsai/types";

import type { DomainNodeData, DomainName } from "./types";

/**
 * Domain metadata registry
 */
const DOMAIN_METADATA = {
  biological: BIOLOGICAL_DOMAIN_INFO,
  social: SOCIAL_DOMAIN_INFO,
  medical: MEDICAL_DOMAIN_INFO,
  technology: TECHNOLOGY_DOMAIN_INFO,
  geographic: GEOGRAPHIC_DOMAIN_INFO,
  economic: ECONOMIC_DOMAIN_INFO,
  academic: ACADEMIC_DOMAIN_INFO,
  legal: LEGAL_DOMAIN_INFO,
  cultural: CULTURAL_DOMAIN_INFO,
  infrastructure: INFRASTRUCTURE_DOMAIN_INFO,
  transportation: TRANSPORTATION_DOMAIN_INFO,
  astronomical: ASTRONOMICAL_DOMAIN_INFO,
} as const;

/**
 * Convert Cytoscape node to domain node data
 */
function convertToDomainNodeData(cytoscapeNode: any): DomainNodeData {
  const nodeData =
    cytoscapeNode.data?.("originalNode") || cytoscapeNode.data?.() || {};

  return {
    uid: nodeData.uid || nodeData.id || "unknown",
    name: nodeData.name || nodeData.label || "Unknown Entity",
    type: nodeData.type || "Organization",
    properties: nodeData.properties || {},
    metadata: nodeData.metadata || nodeData,
  };
}

/**
 * Determine domain from node data using type system
 */
function getDomainFromNode(node: DomainNodeData): DomainName | null {
  const registry = EntitySchemaRegistry.getInstance();

  // Try to get domain from UID first (most reliable)
  const domainFromUID = registry.getDomainFromUID(node.uid);
  if (domainFromUID) {
    return domainFromUID as DomainName;
  }

  // Fallback: check each domain's entity types
  for (const [domainName, metadata] of Object.entries(DOMAIN_METADATA)) {
    // Check if this entity type belongs to this domain by checking entity icons
    if (metadata.ui.entityIcons && metadata.ui.entityIcons[node.type]) {
      return domainName as DomainName;
    }
  }

  // Final fallback to social domain
  return "social";
}

/**
 * Get domain-specific icon using metadata
 */
function getDomainIcon(domain: DomainName, entityType: string): string {
  const domainInfo = DOMAIN_METADATA[domain];

  if (domainInfo?.ui.entityIcons?.[entityType]) {
    return domainInfo.ui.entityIcons[entityType];
  }

  // Fallback to domain default icon
  return domainInfo?.ui.icon || "📝";
}

/**
 * Create property row HTML using CSS classes for whitelabel compatibility
 */
function createPropertyRow(label: string, value: any): string {
  if (!value && value !== 0 && value !== false) return "";

  return `
    <div class="tooltip-property-row">
      <span class="tooltip-property-label">${label}:</span>
      <span class="tooltip-property-value">
        ${String(value).substring(0, 50)}
      </span>
    </div>
  `;
}

/**
 * Generate domain header with icon and metadata using CSS classes
 */
function generateDomainHeader(
  node: DomainNodeData,
  domain: DomainName
): string {
  const icon = getDomainIcon(domain, node.type);

  return `
    <div class="tooltip-header">
      <div class="tooltip-header-content">
        <span class="tooltip-icon">${icon}</span>
        <div class="tooltip-title-group">
          <div class="tooltip-title">${node.name}</div>
          <div class="tooltip-subtitle">${node.type} • ${domain.charAt(0).toUpperCase() + domain.slice(1)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate biological domain tooltip content
 */
function generateBiologicalTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "biological");

  // Scientific classification
  if (properties.scientificName) {
    content += `<div class="tooltip-scientific-name"><em>${properties.scientificName}</em></div>`;
  }

  content += createPropertyRow("Conservation", properties.conservationStatus);
  content += createPropertyRow("Habitat", properties.habitat);
  content += createPropertyRow("Diet", properties.diet);
  content += createPropertyRow("Lifespan", properties.lifespan);
  content += createPropertyRow(
    "Size",
    properties.size || properties.averageHeight || properties.averageLength
  );

  return content;
}

/**
 * Generate social domain tooltip content
 */
function generateSocialTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "social");

  content += createPropertyRow(
    "Role",
    properties.occupation || properties.role
  );
  content += createPropertyRow(
    "Location",
    properties.location || properties.headquarters
  );
  content += createPropertyRow(
    "Founded",
    properties.founded || properties.established
  );
  content += createPropertyRow("Status", properties.status);

  // Bio snippet for people
  if (properties.bio || properties.description) {
    const bio = String(properties.bio || properties.description).substring(
      0,
      100
    );
    content += `<div class="tooltip-bio">${bio}${bio.length === 100 ? "..." : ""}</div>`;
  }

  return content;
}

/**
 * Generate medical domain tooltip content
 */
function generateMedicalTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "medical");

  content += createPropertyRow(
    "ICD Code",
    properties.icd_code || properties.atc_code
  );
  content += createPropertyRow(
    "Type",
    properties.disease_type || properties.drug_type || properties.treatment_type
  );
  content += createPropertyRow("Severity", properties.severity);
  content += createPropertyRow("Status", properties.status);

  return content;
}

/**
 * Generate technology domain tooltip content
 */
function generateTechnologyTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "technology");

  content += createPropertyRow("Version", properties.version);
  content += createPropertyRow("Category", properties.category);
  content += createPropertyRow("License", properties.license);
  content += createPropertyRow("Status", properties.status);

  return content;
}

/**
 * Generate geographic domain tooltip content
 */
function generateGeographicTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "geographic");

  content += createPropertyRow(
    "Population",
    properties.population?.toLocaleString()
  );
  content += createPropertyRow(
    "Area",
    properties.area ? `${properties.area} km²` : undefined
  );
  content += createPropertyRow("Capital", properties.capital);
  content += createPropertyRow(
    "Founded",
    properties.founded || properties.independence
  );

  return content;
}

/**
 * Generate economic domain tooltip content
 */
function generateEconomicTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "economic");

  content += createPropertyRow(
    "Type",
    properties.currency_type ||
      properties.market_type ||
      properties.investment_type
  );
  content += createPropertyRow(
    "Code",
    properties.currency_code || properties.ticker_symbol
  );
  content += createPropertyRow(
    "Market Cap",
    properties.market_cap?.toLocaleString()
  );
  content += createPropertyRow("Status", properties.status);

  return content;
}

/**
 * Generate academic domain tooltip content
 */
function generateAcademicTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "academic");

  content += createPropertyRow(
    "Founded",
    properties.foundedYear || properties.founded
  );
  content += createPropertyRow(
    "Type",
    properties.institutionType ||
      properties.researchType ||
      properties.publicationType
  );
  content += createPropertyRow("Field", properties.field);
  content += createPropertyRow("Status", properties.status);

  return content;
}

/**
 * Generate legal domain tooltip content
 */
function generateLegalTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "legal");

  content += createPropertyRow(
    "Type",
    properties.lawType || properties.courtType || properties.caseType
  );
  content += createPropertyRow("Jurisdiction", properties.jurisdiction);
  content += createPropertyRow("Status", properties.status);
  content += createPropertyRow(
    "Enacted",
    properties.enactedDate || properties.filedDate
  );

  return content;
}

/**
 * Generate cultural domain tooltip content
 */
function generateCulturalTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "cultural");

  content += createPropertyRow("Type", properties.type || properties.category);
  content += createPropertyRow(
    "Created",
    properties.creationDate ||
      properties.releaseDate ||
      properties.publicationDate
  );
  content += createPropertyRow(
    "Artist",
    properties.artist || properties.author
  );
  content += createPropertyRow("Language", properties.language);

  return content;
}

/**
 * Generate infrastructure domain tooltip content
 */
function generateInfrastructureTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "infrastructure");

  content += createPropertyRow(
    "Type",
    properties.building_type ||
      properties.bridge_type ||
      properties.utility_type
  );
  content += createPropertyRow(
    "Built",
    properties.construction_date || properties.completion_date
  );
  content += createPropertyRow(
    "Capacity",
    properties.capacity || properties.passenger_capacity
  );
  content += createPropertyRow("Owner", properties.owner);

  return content;
}

/**
 * Generate transportation domain tooltip content
 */
function generateTransportationTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "transportation");

  content += createPropertyRow(
    "Type",
    properties.vehicle_type || properties.aircraft_type || properties.ship_type
  );
  content += createPropertyRow("Manufacturer", properties.manufacturer);
  content += createPropertyRow(
    "Capacity",
    properties.passenger_capacity || properties.cargo_capacity
  );
  content += createPropertyRow("Operator", properties.operator);

  return content;
}

/**
 * Generate astronomical domain tooltip content
 */
function generateAstronomicalTooltip(node: DomainNodeData): string {
  const properties = node.properties || {};
  let content = generateDomainHeader(node, "astronomical");

  content += createPropertyRow(
    "Type",
    properties.planetType || properties.starType || properties.galaxyType
  );
  content += createPropertyRow(
    "Mass",
    properties.mass ? `${properties.mass} solar masses` : undefined
  );
  content += createPropertyRow(
    "Distance",
    properties.distance ? `${properties.distance} ly` : undefined
  );
  content += createPropertyRow("Discovered", properties.discoveryDate);

  return content;
}

/**
 * Generate generic fallback tooltip content
 */
function generateGenericTooltip(
  node: DomainNodeData,
  domain?: DomainName | null
): string {
  const properties = node.properties || {};
  const displayDomain = domain || "unknown";

  let content = `
    <div class="tooltip-header">
      <div class="tooltip-header-content">
        <span class="tooltip-icon">📝</span>
        <div class="tooltip-title-group">
          <div class="tooltip-title">${node.name}</div>
          <div class="tooltip-subtitle">${node.type} • ${displayDomain}</div>
        </div>
      </div>
    </div>
  `;

  content += `<div class="tooltip-uid">${node.uid}</div>`;

  // Show key properties intelligently
  const keyProps = Object.entries(properties)
    .filter(
      ([key, value]) =>
        value && key !== "uid" && key !== "name" && key !== "type"
    )
    .slice(0, 4);

  if (keyProps.length > 0) {
    keyProps.forEach(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .replace(/_/g, " ");
      content += createPropertyRow(label, value);
    });
  }

  // Show domain not implemented notice
  if (domain && domain !== "social") {
    content += `<div class="tooltip-notice">
      ${displayDomain.charAt(0).toUpperCase() + displayDomain.slice(1)} domain tooltip in development
    </div>`;
  }

  return content;
}

/**
 * Create domain-specific tooltip content as HTML (Atlas pattern)
 */
export function createDomainTooltipContent(cytoscapeNode: any): HTMLElement {
  const node = convertToDomainNodeData(cytoscapeNode);
  const domain = getDomainFromNode(node);

  console.log("🎯 Creating domain tooltip:", {
    domain,
    type: node.type,
    uid: node.uid,
  });

  // Generate domain-specific content using comprehensive generators
  let htmlContent = "";

  switch (domain) {
    case "biological":
      htmlContent = generateBiologicalTooltip(node);
      break;
    case "social":
      htmlContent = generateSocialTooltip(node);
      break;
    case "medical":
      htmlContent = generateMedicalTooltip(node);
      break;
    case "technology":
      htmlContent = generateTechnologyTooltip(node);
      break;
    case "geographic":
      htmlContent = generateGeographicTooltip(node);
      break;
    case "economic":
      htmlContent = generateEconomicTooltip(node);
      break;
    case "academic":
      htmlContent = generateAcademicTooltip(node);
      break;
    case "legal":
      htmlContent = generateLegalTooltip(node);
      break;
    case "cultural":
      htmlContent = generateCulturalTooltip(node);
      break;
    case "infrastructure":
      htmlContent = generateInfrastructureTooltip(node);
      break;
    case "transportation":
      htmlContent = generateTransportationTooltip(node);
      break;
    case "astronomical":
      htmlContent = generateAstronomicalTooltip(node);
      break;
    default:
      htmlContent = generateGenericTooltip(node, domain);
      break;
  }

  // Create container following Atlas pattern exactly
  const div = document.createElement("div");
  div.className = "atlas-tooltip domain-tooltip";

  // DEBUG: Check theme state
  const root = document.documentElement;
  const colorScheme = root.getAttribute("data-color-scheme");
  const themeAttr = root.getAttribute("data-theme");
  const hasDarkClass = root.classList.contains("dark");

  console.log("🎨 TOOLTIP DEBUG:", {
    colorScheme,
    themeAttr,
    hasDarkClass,
    htmlClassList: root.classList.toString(),
  });

  // DEBUG: Check computed CSS variables
  const computedCard = getComputedStyle(root).getPropertyValue("--card").trim();
  const computedForeground = getComputedStyle(root)
    .getPropertyValue("--foreground")
    .trim();
  const computedBorder = getComputedStyle(root)
    .getPropertyValue("--border")
    .trim();

  console.log("🎨 TOOLTIP CSS VARS:", {
    card: computedCard,
    foreground: computedForeground,
    border: computedBorder,
  });

  // Get domain color for subtle border accent (only style we need inline)
  const domainInfo = domain ? DOMAIN_METADATA[domain] : null;
  const borderColor = domainInfo?.ui.color || "#D1D5DB";

  // Only set the domain-specific border color inline (rest handled by CSS)
  div.style.borderLeft = `3px solid ${borderColor}`;

  div.innerHTML = htmlContent;

  // Add to document body immediately (Atlas pattern)
  document.body.appendChild(div);

  // DEBUG: Check tooltip computed styles after adding to DOM
  const tooltipBg = getComputedStyle(div).backgroundColor;
  const tooltipColor = getComputedStyle(div).color;
  const tooltipBorder = getComputedStyle(div).borderColor;

  console.log("🎨 TOOLTIP COMPUTED STYLES:", {
    backgroundColor: tooltipBg,
    color: tooltipColor,
    border: tooltipBorder,
    className: div.className,
  });

  console.log(`✅ Domain tooltip created: ${domain} domain for ${node.type}`);

  return div;
}
