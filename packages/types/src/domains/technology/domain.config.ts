import type { DomainConfig } from "../../domain-system";

import { APIEntitySchema, validateAPIUID, API_UID_PREFIX } from "./api.schema";
import { technologyCardConfig } from "./card.config";
import {
  DatabaseEntitySchema,
  validateDatabaseUID,
  DATABASE_UID_PREFIX,
} from "./database.schema";
import {
  FrameworkEntitySchema,
  validateFrameworkUID,
  FRAMEWORK_UID_PREFIX,
} from "./framework.schema";
import {
  HardwareEntitySchema,
  validateHardwareUID,
  HARDWARE_UID_PREFIX,
} from "./hardware.schema";
import {
  LibraryEntitySchema,
  validateLibraryUID,
  LIBRARY_UID_PREFIX,
} from "./library.schema";
import {
  ProtocolEntitySchema,
  validateProtocolUID,
  PROTOCOL_UID_PREFIX,
} from "./protocol.schema";
import {
  SoftwareEntitySchema,
  validateSoftwareUID,
  SOFTWARE_UID_PREFIX,
} from "./software.schema";

export const technologyDomainConfig: DomainConfig = {
  name: "technology",
  displayName: "Technology",
  description: "Technology domain entities",
  category: "core",

  entities: {
    Software: SoftwareEntitySchema,
    Hardware: HardwareEntitySchema,
    Database: DatabaseEntitySchema,
    API: APIEntitySchema,
    Protocol: ProtocolEntitySchema,
    Framework: FrameworkEntitySchema,
    Library: LibraryEntitySchema,
  },

  enrichmentExamples: {
    Software: {
      input_text:
        "Linux is a free and open-source operating system kernel created by Linus Torvalds in 1991. It is written in C and assembly and is released under the GNU GPL license. Linux powers most of the world's servers and mobile devices.",
      expected_output: {
        name: "Linux",
        license: "GNU GPL",
        creator: "Linus Torvalds",
        created: "1991",
        languages: ["C", "assembly"],
      },
    },
    Database: {
      input_text:
        "PostgreSQL is an open-source relational database management system known for its advanced features and standards compliance. It supports SQL queries and is distributed under the PostgreSQL license. The database is written primarily in C.",
      expected_output: {
        name: "PostgreSQL",
        databaseType: "relational",
        license: "PostgreSQL license",
        queryLanguage: "SQL",
        language: "C",
      },
    },
    Hardware: {
      input_text:
        "The Apple M1 chip is a system-on-chip designed by Apple Inc. Released in 2020, it features an 8-core CPU, up to 8-core GPU, and 16-core Neural Engine. It is manufactured using 5nm process technology.",
      expected_output: {
        manufacturer: "Apple Inc.",
        releaseYear: "2020",
        chipType: "system-on-chip",
        cores: 8,
        processNode: "5nm",
      },
    },
    API: {
      input_text:
        "The Stripe API allows developers to accept payments online. It is a RESTful API that supports HTTP requests and returns JSON responses. The API requires authentication via API keys.",
      expected_output: {
        provider: "Stripe",
        purpose: "accept payments online",
        apiType: "RESTful",
        protocol: "HTTP",
        responseFormat: "JSON",
        authentication: "API keys",
      },
    },
    Protocol: {
      input_text:
        "HTTP (Hypertext Transfer Protocol) is an application-layer protocol for distributed hypermedia systems. Created by Tim Berners-Lee in 1989, it operates on port 80 and forms the foundation of data communication on the World Wide Web.",
      expected_output: {
        name: "HTTP",
        creator: "Tim Berners-Lee",
        created: "1989",
        layer: "application-layer",
        port: 80,
        purpose: "data communication on the World Wide Web",
      },
    },
    Framework: {
      input_text:
        "React is a JavaScript library for building user interfaces developed by Facebook. It was released in 2013 and uses a component-based architecture. React is distributed under the MIT license.",
      expected_output: {
        developer: "Facebook",
        releaseYear: "2013",
        language: "JavaScript",
        purpose: "building user interfaces",
        architecture: "component-based",
        license: "MIT",
      },
    },
    Library: {
      input_text:
        "NumPy is a Python library for numerical computing that provides support for large multi-dimensional arrays and matrices. Created in 2005, it includes a collection of mathematical functions and is open-source.",
      expected_output: {
        language: "Python",
        created: "2005",
        purpose: "numerical computing",
        features: ["arrays", "matrices", "mathematical functions"],
        license: "open-source",
      },
    },
  },

  relationshipExample: {
    input_text:
      "React is built with JavaScript and uses HTML for templating. The Stripe API uses HTTP protocol for RESTful communication and returns JSON responses. NumPy depends on C and Fortran for performance-critical operations. PostgreSQL uses SQL and is built with C. Node.js integrates with JavaScript. React Native implements code reuse across iOS and Android platforms. The Linux kernel is used by different distributions (Ubuntu, Fedora). TensorFlow depends on NumPy for machine learning. The Apache HTTP Server is extended by HTTPS for security.",
    expected_output: {
      relationships: [
        {
          source_entity: "React",
          target_entity: "JavaScript",
          relationship_type: "BUILT_WITH",
          confidence: 0.98,
        },
        {
          source_entity: "Stripe API",
          target_entity: "HTTP",
          relationship_type: "USES",
          confidence: 0.96,
        },
        {
          source_entity: "NumPy",
          target_entity: "C",
          relationship_type: "DEPENDS_ON",
          confidence: 0.94,
        },
        {
          source_entity: "React",
          target_entity: "HTML",
          relationship_type: "USES",
          confidence: 0.95,
        },
        {
          source_entity: "Stripe API",
          target_entity: "JSON",
          relationship_type: "RETURNS",
          confidence: 0.96,
        },
        {
          source_entity: "PostgreSQL",
          target_entity: "SQL",
          relationship_type: "USES",
          confidence: 0.97,
        },
        {
          source_entity: "PostgreSQL",
          target_entity: "C",
          relationship_type: "BUILT_WITH",
          confidence: 0.95,
        },
        {
          source_entity: "Node.js",
          target_entity: "JavaScript",
          relationship_type: "INTEGRATES_WITH",
          confidence: 0.96,
        },
        {
          source_entity: "React Native",
          target_entity: "iOS",
          relationship_type: "IMPLEMENTS",
          confidence: 0.93,
        },
        {
          source_entity: "React Native",
          target_entity: "Android",
          relationship_type: "IMPLEMENTS",
          confidence: 0.93,
        },
        {
          source_entity: "NumPy",
          target_entity: "Fortran",
          relationship_type: "DEPENDS_ON",
          confidence: 0.94,
        },
        {
          source_entity: "Ubuntu",
          target_entity: "Linux kernel",
          relationship_type: "BUILT_WITH",
          confidence: 0.88,
        },
        {
          source_entity: "Fedora",
          target_entity: "Linux kernel",
          relationship_type: "BUILT_WITH",
          confidence: 0.88,
        },
        {
          source_entity: "TensorFlow",
          target_entity: "NumPy",
          relationship_type: "DEPENDS_ON",
          confidence: 0.91,
        },
        {
          source_entity: "HTTPS",
          target_entity: "HTTP",
          relationship_type: "EXTENDS",
          confidence: 0.97,
        },
      ],
    },
  },

  uidPrefixes: {
    Software: SOFTWARE_UID_PREFIX,
    Hardware: HARDWARE_UID_PREFIX,
    Database: DATABASE_UID_PREFIX,
    API: API_UID_PREFIX,
    Protocol: PROTOCOL_UID_PREFIX,
    Framework: FRAMEWORK_UID_PREFIX,
    Library: LIBRARY_UID_PREFIX,
  },

  validators: {
    [SOFTWARE_UID_PREFIX]: validateSoftwareUID,
    [HARDWARE_UID_PREFIX]: validateHardwareUID,
    [DATABASE_UID_PREFIX]: validateDatabaseUID,
    [API_UID_PREFIX]: validateAPIUID,
    [PROTOCOL_UID_PREFIX]: validateProtocolUID,
    [FRAMEWORK_UID_PREFIX]: validateFrameworkUID,
    [LIBRARY_UID_PREFIX]: validateLibraryUID,
  },

  relationships: [
    "BUILT_WITH",
    "USES",
    "IMPLEMENTS",
    "EXTENDS",
    "DEPENDS_ON",
    "REPLACED_BY",
    "INTEGRATES_WITH",
    "RETURNS",
  ],

  ui: {
    color: "#8B5CF6",
    icon: "💻",
    entityIcons: {
      Software: "💾",
      Hardware: "🖥️",
      Database: "🗄️",
      API: "🔌",
      Protocol: "📡",
      Framework: "🏗️",
      Library: "📚",
    },
    card: technologyCardConfig,
  },
};
