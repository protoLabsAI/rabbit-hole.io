import { ExampleCard, type ExampleCardProps } from "./ExampleCard";

interface BasicExamplesProps {
  onApply: ExampleCardProps["onApply"];
}

export function BasicExamples({ onApply }: BasicExamplesProps) {
  return (
    <details open className="border rounded-lg">
      <summary className="font-semibold text-sm px-4 py-3 cursor-pointer hover:bg-muted/50">
        Basic Examples
      </summary>
      <div className="p-4 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExampleCard
          title="Person Information"
          text="Marie Curie was a Polish physicist and chemist who conducted pioneering research on radioactivity. She was the first woman to win a Nobel Prize."
          prompt="Extract person information: name, nationality, profession, achievements"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Albert Einstein was a German-born physicist known for developing the theory of relativity.",
                expected_output: {
                  name: "Albert Einstein",
                  nationality: "German-born",
                  profession: "physicist",
                  achievements: ["developed the theory of relativity"],
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Company Information (Detailed)"
          text="Apple Inc. is an American multinational technology company headquartered in Cupertino, California. Founded in 1976 as Apple Computer Company by Steve Jobs, Steve Wozniak and Ronald Wayne. Notable milestones include the Apple II in 1977, Macintosh in 1984, iPhone launch in 2007. Current products include iPhone, iPad, Mac, Apple Watch, AirPods."
          prompt="Extract company information: company object with name/founded/headquarters/industry, founders array with name/role, keyEvents array with year/description, and products array"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Acme Corporation was founded in 1995 by Jane Smith and John Doe in San Francisco, California. The company specializes in software development and has grown to 500 employees. Notable milestones include their IPO in 2010 and the launch of their flagship product AcmeOS in 2015. Current products include AcmeCloud, AcmeDB, and AcmeDev.",
                expected_output: {
                  company: {
                    name: "Acme Corporation",
                    founded: "1995",
                    headquarters: "San Francisco, California",
                    industry: "Software development",
                  },
                  founders: [
                    {
                      name: "Jane Smith",
                      role: "Co-founder",
                    },
                    {
                      name: "John Doe",
                      role: "Co-founder",
                    },
                  ],
                  keyEvents: [
                    {
                      year: "1995",
                      description: "Company founded",
                    },
                    {
                      year: "2010",
                      description: "IPO",
                    },
                    {
                      year: "2015",
                      description: "Launched flagship product AcmeOS",
                    },
                  ],
                  products: ["AcmeCloud", "AcmeDB", "AcmeDev"],
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Event Information"
          text="The Apollo 11 mission landed on the Moon on July 20, 1969. Neil Armstrong and Buzz Aldrin became the first humans to walk on the lunar surface."
          prompt="Extract event information: name, date, location, participants (as array), significance"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "The Wright Brothers first powered flight occurred on December 17, 1903, at Kitty Hawk, North Carolina, with Orville Wright piloting.",
                expected_output: {
                  name: "Wright Brothers first powered flight",
                  date: "1903-12-17",
                  location: "Kitty Hawk, North Carolina",
                  participants: ["Orville Wright", "Wilbur Wright"],
                  significance: "First successful powered airplane flight",
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Medical Information"
          text="COVID-19 is an infectious disease caused by the SARS-CoV-2 virus. Common symptoms include fever, cough, and fatigue. It was first identified in Wuhan, China in December 2019."
          prompt="Extract disease information: name, pathogen, symptoms (as array), first_identified_location, first_identified_date"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Malaria is a disease caused by Plasmodium parasites, transmitted by mosquitoes. Symptoms include fever, chills, and headache.",
                expected_output: {
                  name: "Malaria",
                  pathogen: "Plasmodium parasites",
                  symptoms: ["fever", "chills", "headache"],
                  transmission: "transmitted by mosquitoes",
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Funding & Expansion"
          text="Tesla Inc., led by CEO Elon Musk, announced a $500M funding round on March 15, 2024. The round was led by Sequoia Capital and Andreessen Horowitz, with participation from Y Combinator. The company, headquartered in Austin, Texas, plans to use the funds to expand its Gigafactory in Berlin, Germany and hire 500 engineers across software, hardware, and AI divisions."
          prompt="Extract detailed funding and company information with relationships"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Acme Corp raised $100M Series B led by Greylock Partners. Based in San Francisco, they will expand to Tokyo and hire 50 developers.",
                expected_output: {
                  company: {
                    name: "Acme Corp",
                    headquarters: "San Francisco",
                    ceo: null,
                  },
                  funding: {
                    amount: 100000000,
                    date: null,
                    leadInvestors: ["Greylock Partners"],
                    participatingInvestors: [],
                  },
                  expansion: {
                    locations: [{ city: "Tokyo", country: "Japan" }],
                    hiring: { total: 50, departments: ["developers"] },
                  },
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Technical Documentation"
          text="The GraphQL API v2.0 endpoint is available at https://api.example.com/graphql. Authentication requires a Bearer token in the Authorization header. Rate limits: 1000 requests per hour for free tier, 10000 for pro tier. SDK available in TypeScript (v3.2.1), Python (v2.1.0), and Go (v1.5.0)."
          prompt="Extract API specifications, endpoints, and implementation details"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "REST API v1.0 at https://api.test.com/v1. Uses API key authentication in X-API-Key header. 500 req/hr limit. Node.js SDK v2.0.0 available.",
                expected_output: {
                  api: {
                    name: "REST API",
                    version: "1.0",
                    baseUrl: "https://api.test.com/v1",
                  },
                  authentication: {
                    method: "API Key",
                    headerName: "X-API-Key",
                  },
                  endpoints: [
                    {
                      type: "REST",
                      url: "https://api.test.com/v1",
                      protocol: "https",
                    },
                  ],
                  rateLimits: [{ tier: "default", requestsPerHour: 500 }],
                  sdks: [{ language: "Node.js", version: "2.0.0" }],
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Scientific Research"
          text="A study published in Nature Medicine (DOI: 10.1038/nm.4567) by Dr. Sarah Chen and colleagues at Stanford University demonstrated that CRISPR-Cas9 gene editing successfully corrected the BRCA1 mutation in 89% of test samples (n=150, p<0.001). The research, funded by NIH grant R01-CA234567 ($2.5M over 3 years), showed significant improvements in cellular DNA repair mechanisms."
          prompt="Extract comprehensive research study details including methodology and results"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Published in Cell Biology (DOI: 10.1016/cell.123) by Dr. Jane Doe at MIT, showing 75% efficacy in cancer treatment (n=200, p<0.05). NIH funded, $1M.",
                expected_output: {
                  publication: {
                    journal: "Cell Biology",
                    doi: "10.1016/cell.123",
                  },
                  authors: [{ name: "Dr. Jane Doe", affiliation: "MIT" }],
                  methodology: {
                    technique: "cancer treatment",
                    target: null,
                    sampleSize: 200,
                  },
                  results: {
                    successRate: 75,
                    pValue: "p<0.05",
                    controlGroupRate: null,
                    sideEffects: null,
                  },
                  funding: {
                    source: "NIH",
                    grantNumber: null,
                    amount: 1000000,
                    duration: null,
                  },
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Event Timeline"
          text="Timeline of SpaceX Starship Development: Feb 2019: First prototype (Starhopper) unveiled in Boca Chica, TX. July 2019: Starhopper completes 150m hop test, cost: $20M. Sept 2020: SN8 prototype performs 12.5km flight test, RUD on landing. May 2021: SN15 achieves first successful landing after 10km flight."
          prompt="Extract chronological events with detailed metrics and outcomes"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Project X Timeline: Jan 2020: Alpha release. June 2020: Beta launch with 1000 users. Dec 2020: GA with 50k users.",
                expected_output: {
                  project: { name: "Project X", primaryLocation: null },
                  events: [
                    {
                      date: "2020-01",
                      milestone: "Alpha release",
                      prototype: null,
                      metrics: {},
                      outcome: null,
                    },
                    {
                      date: "2020-06",
                      milestone: "Beta launch",
                      prototype: null,
                      metrics: { users: "1000" },
                      outcome: null,
                    },
                    {
                      date: "2020-12",
                      milestone: "GA",
                      prototype: null,
                      metrics: { users: "50k" },
                      outcome: null,
                    },
                  ],
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Earnings Call Data"
          text="Q3 2024 Earnings Call - TechCorp Inc. CEO John Smith: Revenue of $1.2B, up 45% QoQ. New AI product line contributed $450M. Expanded to APAC with offices in Singapore, Tokyo, and Seoul, hiring 200+ staff. Customer acquisition cost dropped from $250 to $180 while LTV increased to $3,200. Churn rate improved from 5.2% to 3.8%."
          prompt="Extract financial metrics, geographic expansion, partnerships, and strategic insights"
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Q2 2024 - FinCorp. Revenue $500M, up 20% YoY. Opened London office, hired 100 staff. CAC down to $100, LTV at $2000.",
                expected_output: {
                  company: "FinCorp",
                  quarter: "Q2 2024",
                  executives: [],
                  financials: {
                    revenue: {
                      total: 500000000,
                      growth: "20% YoY",
                      breakdown: [],
                    },
                    expenses: { total: null, breakdown: [] },
                    cash: null,
                  },
                  metrics: {
                    customerAcquisitionCost: {
                      previous: null,
                      current: 100,
                    },
                    lifetimeValue: 2000,
                    churnRate: { previous: null, current: null },
                  },
                  expansion: {
                    region: "Europe",
                    offices: [{ city: "London" }],
                    headcount: 100,
                  },
                  partnerships: [],
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
        <ExampleCard
          title="Relationship Discovery (Structured Format)"
          text="Marie Curie was a Polish-French physicist and chemist who conducted pioneering research on radioactivity at the University of Paris. She worked closely with her husband Pierre Curie at the Sorbonne from 1895 to 1906. Marie Curie was born in Warsaw, Poland in 1867 and later moved to Paris to study at the University of Paris. She became the first woman to win a Nobel Prize and the first person to win Nobel Prizes in two different sciences. Albert Einstein was a colleague and friend who corresponded with Curie throughout her career."
          prompt="Find relationships between entities. For each relationship provide: source_entity (name), target_entity (name), relationship_type (e.g., WORKED_AT, MARRIED_TO, BORN_IN, EDUCATED_AT, COLLEAGUE_OF), start_date (if known), end_date (if known), and confidence (0.0-1.0)."
          examples={JSON.stringify(
            [
              {
                input_text:
                  "Einstein worked at Princeton University from 1933 to 1955 where he developed his theories on physics. He was born in Ulm, Germany in 1879 and studied at ETH Zurich from 1896 to 1900. He collaborated with Niels Bohr throughout his career.",
                expected_output: {
                  relationships: [
                    {
                      source_entity: "Einstein",
                      target_entity: "Princeton University",
                      relationship_type: "WORKED_AT",
                      start_date: "1933",
                      end_date: "1955",
                      confidence: 0.95,
                    },
                    {
                      source_entity: "Einstein",
                      target_entity: "Ulm",
                      relationship_type: "BORN_IN",
                      start_date: "1879",
                      end_date: null,
                      confidence: 0.95,
                    },
                    {
                      source_entity: "Einstein",
                      target_entity: "ETH Zurich",
                      relationship_type: "EDUCATED_AT",
                      start_date: "1896",
                      end_date: "1900",
                      confidence: 0.9,
                    },
                    {
                      source_entity: "Einstein",
                      target_entity: "Niels Bohr",
                      relationship_type: "COLLABORATED_WITH",
                      start_date: null,
                      end_date: null,
                      confidence: 0.85,
                    },
                  ],
                },
              },
            ],
            null,
            2
          )}
          onApply={onApply}
        />
      </div>
    </details>
  );
}
