import type { DomainConfig } from "../../domain-system";

import { legalCardConfig } from "./card.config";
import {
  CaseEntitySchema,
  validateCaseUID,
  CASE_UID_PREFIX,
} from "./case.schema";
import {
  ContractEntitySchema,
  validateContractUID,
  CONTRACT_UID_PREFIX,
} from "./contract.schema";
import {
  CourtEntitySchema,
  validateCourtUID,
  COURT_UID_PREFIX,
} from "./court.schema";
import { LawEntitySchema, validateLawUID, LAW_UID_PREFIX } from "./law.schema";
import {
  LicenseEntitySchema,
  validateLicenseUID,
  LICENSE_UID_PREFIX,
} from "./license.schema";
import {
  PatentEntitySchema,
  validatePatentUID,
  PATENT_UID_PREFIX,
} from "./patent.schema";
import {
  RegulationEntitySchema,
  validateRegulationUID,
  REGULATION_UID_PREFIX,
} from "./regulation.schema";

export const legalDomainConfig: DomainConfig = {
  name: "legal",
  displayName: "Legal",
  description: "Legal domain entities",
  category: "core",

  entities: {
    Law: LawEntitySchema,
    Court: CourtEntitySchema,
    Case: CaseEntitySchema,
    Regulation: RegulationEntitySchema,
    Patent: PatentEntitySchema,
    License: LicenseEntitySchema,
    Contract: ContractEntitySchema,
  },

  enrichmentExamples: {
    Law: {
      input_text:
        "The Clean Air Act is a United States federal law enacted in 1970 and significantly amended in 1990. The law regulates air pollution and establishes standards for air quality. It is enforced by the Environmental Protection Agency and applies to stationary and mobile sources of pollution.",
      expected_output: {
        lawName: "Clean Air Act",
        enacted: "1970",
        country: "United States",
        subject: "air pollution",
        enforcingAgency: "Environmental Protection Agency",
      },
    },
    Court: {
      input_text:
        "The Supreme Court of the United States is the highest federal court in the United States. It is located in Washington, D.C. and was established in 1789. The court has nine justices and hears cases of national importance.",
      expected_output: {
        courtName: "Supreme Court of the United States",
        location: "Washington, D.C.",
        established: "1789",
        justices: 9,
        jurisdiction: "national",
      },
    },
    Case: {
      input_text:
        "Brown v. Board of Education was a landmark 1954 Supreme Court case that declared racial segregation in public schools unconstitutional. The case consolidated five separate cases and was decided unanimously.",
      expected_output: {
        caseName: "Brown v. Board of Education",
        year: "1954",
        court: "Supreme Court",
        outcome: "unconstitutional",
        significance: "landmark case",
        decision: "unanimous",
      },
    },
    Regulation: {
      input_text:
        "GDPR (General Data Protection Regulation) is a European Union regulation that took effect in May 2018. It governs data protection and privacy for individuals within the EU and includes provisions for substantial fines for non-compliance.",
      expected_output: {
        regulationName: "GDPR",
        jurisdiction: "European Union",
        effectiveDate: "May 2018",
        subject: "data protection and privacy",
        enforcement: "substantial fines",
      },
    },
    Patent: {
      input_text:
        "US Patent 1,647,470 was granted to Thomas Edison in 1927 for improvements to the electric lamp. The patent has since expired and entered the public domain.",
      expected_output: {
        patentNumber: "US 1,647,470",
        inventor: "Thomas Edison",
        grantedYear: "1927",
        subject: "electric lamp improvements",
        status: "expired",
      },
    },
    License: {
      input_text:
        "The MIT License is a permissive open-source software license that allows reuse with minimal restrictions. Created at the Massachusetts Institute of Technology, it permits commercial use, modification, and distribution.",
      expected_output: {
        licenseName: "MIT License",
        licenseType: "permissive",
        origin: "Massachusetts Institute of Technology",
        permissions: ["commercial use", "modification", "distribution"],
      },
    },
    Contract: {
      input_text:
        "A non-disclosure agreement (NDA) is a legal contract between two or more parties that restricts the sharing of confidential information. NDAs typically have a duration of 2-5 years and include penalties for breach.",
      expected_output: {
        contractType: "non-disclosure agreement",
        parties: "two or more",
        purpose: "restrict sharing of confidential information",
        typicalDuration: "2-5 years",
        enforcement: "penalties for breach",
      },
    },
  },

  relationshipExample: {
    input_text:
      "The Clean Air Act governs air pollution standards in the United States, enacted in 1970. The Environmental Protection Agency enforces the Clean Air Act regulations. The Supreme Court adjudicates constitutional challenges to the Clean Air Act. Brown v. Board of Education was filed in the Supreme Court in 1954 and overturned Plessy v. Ferguson. The GDPR regulation was filed in the European Union and is enforced by data protection authorities. Thomas Edison was issued US Patent 1,647,470 for electrical lamp improvements. The MIT License was issued by Massachusetts Institute of Technology. A non-disclosure agreement was filed in Delaware courts.",
    expected_output: {
      relationships: [
        {
          source_entity: "Clean Air Act",
          target_entity: "air pollution standards",
          relationship_type: "GOVERNS",
          start_date: "1970",
          confidence: 0.96,
        },
        {
          source_entity: "Environmental Protection Agency",
          target_entity: "Clean Air Act",
          relationship_type: "ENFORCES",
          confidence: 0.97,
        },
        {
          source_entity: "Supreme Court",
          target_entity: "Clean Air Act",
          relationship_type: "ADJUDICATES",
          confidence: 0.91,
        },
        {
          source_entity: "Brown v. Board of Education",
          target_entity: "Supreme Court",
          relationship_type: "FILED_IN",
          start_date: "1954",
          confidence: 0.99,
        },
        {
          source_entity: "Brown v. Board of Education",
          target_entity: "Plessy v. Ferguson",
          relationship_type: "OVERRULES",
          confidence: 0.98,
        },
        {
          source_entity: "GDPR",
          target_entity: "European Union",
          relationship_type: "FILED_IN",
          confidence: 0.95,
        },
        {
          source_entity: "Data Protection Authorities",
          target_entity: "GDPR",
          relationship_type: "ENFORCES",
          confidence: 0.94,
        },
        {
          source_entity: "US Patent 1,647,470",
          target_entity: "Thomas Edison",
          relationship_type: "ISSUED_BY",
          confidence: 0.97,
        },
        {
          source_entity: "MIT License",
          target_entity: "Massachusetts Institute of Technology",
          relationship_type: "ISSUED_BY",
          confidence: 0.96,
        },
        {
          source_entity: "Non-disclosure agreement",
          target_entity: "Delaware courts",
          relationship_type: "FILED_IN",
          confidence: 0.92,
        },
      ],
    },
  },

  uidPrefixes: {
    Law: LAW_UID_PREFIX,
    Court: COURT_UID_PREFIX,
    Case: CASE_UID_PREFIX,
    Regulation: REGULATION_UID_PREFIX,
    Patent: PATENT_UID_PREFIX,
    License: LICENSE_UID_PREFIX,
    Contract: CONTRACT_UID_PREFIX,
  },

  validators: {
    [LAW_UID_PREFIX]: validateLawUID,
    [COURT_UID_PREFIX]: validateCourtUID,
    [CASE_UID_PREFIX]: validateCaseUID,
    [REGULATION_UID_PREFIX]: validateRegulationUID,
    [PATENT_UID_PREFIX]: validatePatentUID,
    [LICENSE_UID_PREFIX]: validateLicenseUID,
    [CONTRACT_UID_PREFIX]: validateContractUID,
  },

  relationships: [
    "GOVERNS",
    "ENFORCES",
    "ADJUDICATES",
    "REGULATES",
    "FILED_IN",
    "ISSUED_BY",
  ],

  ui: {
    color: "#64748B",
    icon: "⚖️",
    entityIcons: {
      Law: "📜",
      Court: "🏛️",
      Case: "⚖️",
      Regulation: "📋",
      Patent: "📜",
      License: "🆔",
      Contract: "📄",
    },
    card: legalCardConfig,
  },
};
