import type { DomainConfig } from "../../domain-system";

import { socialCardConfig } from "./card.config";
import {
  EventEntitySchema,
  validateEventUID,
  EVENT_UID_PREFIX,
} from "./event.schema";
import {
  MediaEntitySchema,
  validateMediaUID,
  MEDIA_UID_PREFIX,
} from "./media.schema";
import {
  MovementEntitySchema,
  validateMovementUID,
  MOVEMENT_UID_PREFIX,
} from "./movement.schema";
import {
  OrganizationEntitySchema,
  validateOrganizationUID,
  ORGANIZATION_UID_PREFIX,
} from "./organization.schema";
import {
  PersonEntitySchema,
  validatePersonUID,
  PERSON_UID_PREFIX,
} from "./person.schema";
import {
  PlatformEntitySchema,
  validatePlatformUID,
  PLATFORM_UID_PREFIX,
} from "./platform.schema";

export const socialDomainConfig: DomainConfig = {
  name: "social",
  displayName: "Social",
  description:
    "Social entities - people, organizations, platforms, movements, events, media",
  category: "core",

  entities: {
    Person: PersonEntitySchema,
    Organization: OrganizationEntitySchema,
    Platform: PlatformEntitySchema,
    Movement: MovementEntitySchema,
    Event: EventEntitySchema,
    Media: MediaEntitySchema,
  },

  enrichmentExamples: {
    Person: {
      input_text:
        "Albert Einstein was born on March 14, 1879, in Ulm, Germany, and died on April 18, 1955, in Princeton, New Jersey. He was a German-born theoretical physicist who studied at ETH Zurich.",
      expected_output: {
        birthDate: "1879-03-14",
        birthPlace: "Ulm, Germany",
        deathDate: "1955-04-18",
        deathPlace: "Princeton, New Jersey",
        nationality: "German-born",
        occupation: "theoretical physicist",
        education: ["ETH Zurich"],
      },
    },
    Organization: {
      input_text:
        "Tesla Inc was founded in 2003 in San Carlos, California as an electric vehicle manufacturer. The company has headquarters in Austin, Texas and employs over 100,000 people across the automotive industry.",
      expected_output: {
        founded: "2003",
        headquarters: "Austin, Texas",
        industry: "automotive",
        employees: 100000,
        orgType: "electric vehicle manufacturer",
      },
    },
    Event: {
      input_text:
        "Donald Trump held a campaign rally in Des Moines, Iowa on January 15, 2024, drawing thousands of supporters. The event focused on economic policy and border security. Trump appeared in federal court on January 28, 2024 for a hearing related to classified documents. In March 2024, Trump announced his running mate at a major press conference in Mar-a-Lago.",
      expected_output: {
        event: [
          {
            name: "Des Moines Campaign Rally",
            eventType: "rally",
            date: "2024-01-15",
            location: "Des Moines, Iowa",
            significance: "major",
            description:
              "Campaign rally focusing on economic policy and border security",
            participants: ["Donald Trump"],
            media_coverage: "extensive",
          },
          {
            name: "Federal Court Hearing (Classified Documents)",
            eventType: "legal_proceeding",
            date: "2024-01-28",
            significance: "major",
            participants: ["Donald Trump"],
            media_coverage: "extensive",
          },
          {
            name: "Running Mate Announcement Press Conference",
            eventType: "conference",
            date: "2024-03",
            location: "Mar-a-Lago",
            significance: "major",
            participants: ["Donald Trump"],
            media_coverage: "global",
          },
        ],
      },
    },
  },

  relationshipExample: {
    input_text:
      "Marie Curie worked at the Sorbonne in Paris from 1906 to 1934 as a physics professor. She was married to Pierre Curie and had a daughter, Irène Joliot-Curie, who was also a scientist. Marie and Pierre collaborated on research about radioactivity. Marie was a member of the International Women's Suffrage Alliance, which was founded by Carrie Chapman Catt. She participated in the 1911 Solvay Conference in Brussels. The New York Times published an article about her scientific achievements. Marie Curie endorsed radioactivity research as a solution for modern energy challenges. She delivered a public speech at the 1933 Paris Science Exposition.",
    expected_output: {
      relationships: [
        {
          source_entity: "Marie Curie",
          target_entity: "Sorbonne",
          relationship_type: "AFFILIATED_WITH",
          start_date: "1906",
          end_date: "1934",
          confidence: 0.96,
        },
        {
          source_entity: "Marie Curie",
          target_entity: "Pierre Curie",
          relationship_type: "MARRIED_TO",
          confidence: 0.99,
        },
        {
          source_entity: "Marie Curie",
          target_entity: "Irène Joliot-Curie",
          relationship_type: "PARENT_OF",
          confidence: 0.98,
        },
        {
          source_entity: "Marie Curie",
          target_entity: "Pierre Curie",
          relationship_type: "COLLABORATED_WITH",
          confidence: 0.97,
        },
        {
          source_entity: "Marie Curie",
          target_entity: "International Women's Suffrage Alliance",
          relationship_type: "BELONGS_TO",
          confidence: 0.92,
        },
        {
          source_entity: "International Women's Suffrage Alliance",
          target_entity: "Carrie Chapman Catt",
          relationship_type: "FOUNDED_BY",
          confidence: 0.95,
        },
        {
          source_entity: "Marie Curie",
          target_entity: "1911 Solvay Conference",
          relationship_type: "PARTICIPATES_IN",
          start_date: "1911",
          confidence: 0.94,
        },
        {
          source_entity: "New York Times",
          target_entity: "Marie Curie",
          relationship_type: "MENTIONS",
          confidence: 0.91,
        },
        {
          source_entity: "Marie Curie",
          target_entity: "radioactivity research",
          relationship_type: "ENDORSES",
          confidence: 0.88,
        },
        {
          source_entity: "Marie Curie",
          target_entity: "1933 Paris Science Exposition",
          relationship_type: "APPEARS_AT",
          start_date: "1933",
          confidence: 0.89,
        },
      ],
    },
  },

  uidPrefixes: {
    Person: PERSON_UID_PREFIX,
    Organization: ORGANIZATION_UID_PREFIX,
    Platform: PLATFORM_UID_PREFIX,
    Movement: MOVEMENT_UID_PREFIX,
    Event: EVENT_UID_PREFIX,
    Media: MEDIA_UID_PREFIX,
  },

  validators: {
    [PERSON_UID_PREFIX]: validatePersonUID,
    [ORGANIZATION_UID_PREFIX]: validateOrganizationUID,
    [PLATFORM_UID_PREFIX]: validatePlatformUID,
    [MOVEMENT_UID_PREFIX]: validateMovementUID,
    [EVENT_UID_PREFIX]: validateEventUID,
    [MEDIA_UID_PREFIX]: validateMediaUID,
  },

  relationships: [
    "SPEECH_ACT",
    "FUNDS",
    "PLATFORMS",
    "ENDORSES",
    "ATTACKS",
    "BADMOUTHS",
    "AMPLIFIES",
    "OWNS",
    "HOLDS_ROLE",
    "BELONGS_TO",
    "AFFILIATED_WITH",
    "PARTICIPATES_IN",
    "MENTIONS",
    "MARRIED_TO",
    "DIVORCED_FROM",
    "PARENT_OF",
    "CHILD_OF",
    "SIBLING_OF",
    "CONTROLS",
    "APPEARS_AT",
    "EVIDENCES",
    "EXPERIENCES_EVENT",
    "COLLABORATED_WITH",
    "FOUNDED_BY",
  ],

  ui: {
    color: "#3B82F6",
    icon: "👥",
    entityIcons: {
      Person: "👤",
      Organization: "🏢",
      Platform: "💻",
      Movement: "🌊",
      Event: "📅",
      Media: "📺",
      Athlete: "🏃",
      Character: "🎭",
      Location: "📍",
    },
    card: socialCardConfig,
  },
};
