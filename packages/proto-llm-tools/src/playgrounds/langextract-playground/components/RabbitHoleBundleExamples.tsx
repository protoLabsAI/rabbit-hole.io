import { ExampleCard, type ExampleCardProps } from "./ExampleCard";

interface RabbitHoleBundleExamplesProps {
  onApply: ExampleCardProps["onApply"];
}

export function RabbitHoleBundleExamples({
  onApply,
}: RabbitHoleBundleExamplesProps) {
  return (
    <details className="border rounded-lg">
      <summary className="font-semibold text-sm px-4 py-3 cursor-pointer hover:bg-muted/50">
        Rabbit Hole Bundles (Full Schema)
      </summary>
      <div className="p-4 pt-2 space-y-4">
        <p className="text-xs text-muted-foreground mb-4">
          These examples demonstrate extracting directly into the Rabbit Hole
          bundle format with evidence, entities, and relationships.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExampleCard
            title="Political Network Bundle"
            text="Senator Elizabeth Warren represents Massachusetts and has been advocating for healthcare reform since 2013. She ran for president in 2020 but endorsed Joe Biden after dropping out in March 2020. Warren previously taught at Harvard Law School from 1995 to 2012 and was born in Oklahoma City in 1949."
            prompt="Extract a complete Rabbit Hole bundle with entities and relationships. Include evidence metadata, entity details, and relationships between people, organizations, and locations."
            examples={JSON.stringify(
              [
                {
                  input_text:
                    "Bernie Sanders is a U.S. Senator from Vermont. He ran for president in 2016 and 2020, competing against Hillary Clinton and Joe Biden. Sanders was born in Brooklyn, New York in 1941 and served as Mayor of Burlington from 1981 to 1989.",
                  expected_output: {
                    evidence: [
                      {
                        uid: "evidence:wikipedia_bernie_sanders",
                        kind: "major_media",
                        title: "Bernie Sanders Wikipedia",
                        publisher: "Wikipedia",
                        date: "2025-01-01",
                        url: "https://wikipedia.org/wiki/Bernie_Sanders",
                        reliability: 0.85,
                      },
                    ],
                    files: [],
                    content: [],
                    entities: [
                      {
                        uid: "person:bernie_sanders",
                        type: "Person",
                        name: "Bernie Sanders",
                        aliases: ["Bernard Sanders"],
                        tags: ["politician", "progressive", "senator"],
                        properties: {
                          birthDate: "1941",
                          birthplace: "Brooklyn, New York",
                          currentRole: "U.S. Senator from Vermont",
                        },
                      },
                      {
                        uid: "location:vermont",
                        type: "Location",
                        name: "Vermont",
                        aliases: [],
                        tags: ["state", "us"],
                        properties: {},
                      },
                      {
                        uid: "person:hillary_clinton",
                        type: "Person",
                        name: "Hillary Clinton",
                        aliases: [],
                        tags: ["politician", "democrat"],
                        properties: {},
                      },
                      {
                        uid: "person:joe_biden",
                        type: "Person",
                        name: "Joe Biden",
                        aliases: [],
                        tags: ["politician", "president"],
                        properties: {},
                      },
                    ],
                    relationships: [
                      {
                        uid: "rel:sanders_represents_vermont",
                        type: "REPRESENTS",
                        source: "person:bernie_sanders",
                        target: "location:vermont",
                        properties: {
                          role: "U.S. Senator",
                          confidence: 0.95,
                        },
                      },
                      {
                        uid: "rel:sanders_ran_against_clinton",
                        type: "COMPETED_AGAINST",
                        source: "person:bernie_sanders",
                        target: "person:hillary_clinton",
                        properties: {
                          context: "2016 Democratic Primary",
                          confidence: 0.9,
                        },
                      },
                      {
                        uid: "rel:sanders_ran_against_biden",
                        type: "COMPETED_AGAINST",
                        source: "person:bernie_sanders",
                        target: "person:joe_biden",
                        properties: {
                          context: "2020 Democratic Primary",
                          confidence: 0.9,
                        },
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
            title="Academic Collaboration Bundle"
            text="Dr. Marie Curie worked at the University of Paris studying radioactivity from 1895 to 1934. She collaborated with her husband Pierre Curie until his death in 1906. Marie won the Nobel Prize in Physics in 1903 (shared with Pierre and Henri Becquerel) and the Nobel Prize in Chemistry in 1911. She was born in Warsaw, Poland in 1867."
            prompt="Extract a complete Rabbit Hole bundle capturing the academic network, research collaboration, and institutional relationships."
            examples={JSON.stringify(
              [
                {
                  input_text:
                    "Dr. Albert Einstein worked at Princeton University from 1933 to 1955. He collaborated with mathematician Kurt Gödel and physicist Niels Bohr. Einstein won the Nobel Prize in Physics in 1921 and was born in Ulm, Germany in 1879.",
                  expected_output: {
                    evidence: [
                      {
                        uid: "evidence:princeton_archives",
                        kind: "research",
                        title: "Princeton University Archives",
                        publisher: "Princeton University",
                        date: "2024-01-01",
                        url: "https://princeton.edu/archives",
                        reliability: 0.9,
                      },
                    ],
                    files: [],
                    content: [],
                    entities: [
                      {
                        uid: "person:albert_einstein",
                        type: "Person",
                        name: "Albert Einstein",
                        aliases: [],
                        tags: ["physicist", "nobel_laureate"],
                        properties: {
                          birthDate: "1879",
                          birthplace: "Ulm, Germany",
                        },
                      },
                      {
                        uid: "org:princeton_university",
                        type: "Organization",
                        name: "Princeton University",
                        aliases: ["Princeton"],
                        tags: ["university", "ivy_league"],
                        properties: {},
                      },
                      {
                        uid: "person:kurt_godel",
                        type: "Person",
                        name: "Kurt Gödel",
                        aliases: [],
                        tags: ["mathematician", "logician"],
                        properties: {},
                      },
                    ],
                    relationships: [
                      {
                        uid: "rel:einstein_worked_at_princeton",
                        type: "WORKED_AT",
                        source: "person:albert_einstein",
                        target: "org:princeton_university",
                        properties: {
                          start_date: "1933",
                          end_date: "1955",
                          confidence: 0.95,
                        },
                      },
                      {
                        uid: "rel:einstein_collaborated_godel",
                        type: "COLLABORATED_WITH",
                        source: "person:albert_einstein",
                        target: "person:kurt_godel",
                        properties: {
                          context: "Mathematical and physical theories",
                          confidence: 0.85,
                        },
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
            title="Business Ecosystem Bundle"
            text="Tesla Inc. was founded by Elon Musk and others in 2003, headquartered in Austin, Texas. The company went public in 2010 and has manufacturing facilities in Fremont, California and Shanghai, China. Tesla acquired SolarCity in 2016 for $2.6 billion. Musk also founded SpaceX in 2002 and acquired Twitter (now X) in 2022."
            prompt="Extract a complete Rabbit Hole bundle capturing corporate relationships, acquisitions, and leadership connections."
            examples={JSON.stringify(
              [
                {
                  input_text:
                    "Meta Platforms was founded as Facebook by Mark Zuckerberg in 2004 in Menlo Park, California. The company acquired Instagram in 2012 for $1 billion and WhatsApp in 2014 for $19 billion. Meta is headquartered in Menlo Park and went public in 2012.",
                  expected_output: {
                    evidence: [
                      {
                        uid: "evidence:sec_filing_meta",
                        kind: "government",
                        title: "Meta SEC Filings",
                        publisher: "U.S. Securities and Exchange Commission",
                        date: "2024-01-01",
                        url: "https://sec.gov/meta",
                        reliability: 0.95,
                      },
                    ],
                    files: [],
                    content: [],
                    entities: [
                      {
                        uid: "org:meta_platforms",
                        type: "Organization",
                        name: "Meta Platforms",
                        aliases: ["Facebook", "Meta"],
                        tags: ["technology", "social_media", "public_company"],
                        properties: {
                          foundedDate: "2004",
                          headquarters: "Menlo Park, California",
                          ipoDate: "2012",
                        },
                      },
                      {
                        uid: "person:mark_zuckerberg",
                        type: "Person",
                        name: "Mark Zuckerberg",
                        aliases: [],
                        tags: ["ceo", "entrepreneur", "founder"],
                        properties: {},
                      },
                      {
                        uid: "org:instagram",
                        type: "Organization",
                        name: "Instagram",
                        aliases: [],
                        tags: ["social_media", "photo_sharing"],
                        properties: {},
                      },
                      {
                        uid: "org:whatsapp",
                        type: "Organization",
                        name: "WhatsApp",
                        aliases: [],
                        tags: ["messaging", "mobile_app"],
                        properties: {},
                      },
                    ],
                    relationships: [
                      {
                        uid: "rel:zuckerberg_founded_meta",
                        type: "FOUNDED",
                        source: "person:mark_zuckerberg",
                        target: "org:meta_platforms",
                        properties: {
                          date: "2004",
                          confidence: 0.95,
                        },
                      },
                      {
                        uid: "rel:meta_acquired_instagram",
                        type: "ACQUIRED",
                        source: "org:meta_platforms",
                        target: "org:instagram",
                        properties: {
                          date: "2012",
                          amount: 1000000000,
                          currency: "USD",
                          confidence: 0.95,
                        },
                      },
                      {
                        uid: "rel:meta_acquired_whatsapp",
                        type: "ACQUIRED",
                        source: "org:meta_platforms",
                        target: "org:whatsapp",
                        properties: {
                          date: "2014",
                          amount: 19000000000,
                          currency: "USD",
                          confidence: 0.95,
                        },
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
            title="Ecosystem & Species Bundle"
            text="The European rabbit (Oryctolagus cuniculus) inhabits grassland meadows across Europe. Rabbits primarily eat clover and grass. They are hunted by red foxes (Vulpes vulpes) as a primary food source. Domestic rabbits were bred from wild European rabbits starting around 600 CE for meat and fur."
            prompt="Extract a complete Rabbit Hole bundle capturing ecological relationships, predator-prey dynamics, and species interactions."
            examples={JSON.stringify(
              [
                {
                  input_text:
                    "Gray wolves (Canis lupus) live in boreal forests and hunt elk (Cervus canadensis) in packs. Wolves were reintroduced to Yellowstone National Park in 1995. Elk graze on willow and aspen trees in riparian areas.",
                  expected_output: {
                    evidence: [
                      {
                        uid: "evidence:yellowstone_wolf_study",
                        kind: "research",
                        title: "Yellowstone Wolf Reintroduction Study",
                        publisher: "National Park Service",
                        date: "2024-01-01",
                        url: "https://nps.gov/yellowstone/wolves",
                        reliability: 0.9,
                      },
                    ],
                    files: [],
                    content: [],
                    entities: [
                      {
                        uid: "animal:gray_wolf",
                        type: "Animal",
                        name: "Gray Wolf",
                        aliases: ["Canis lupus"],
                        tags: [
                          "mammal",
                          "carnivore",
                          "predator",
                          "pack_animal",
                        ],
                        properties: {
                          scientificName: "Canis lupus",
                          habitat: "boreal forests",
                        },
                      },
                      {
                        uid: "animal:elk",
                        type: "Animal",
                        name: "Elk",
                        aliases: ["Cervus canadensis", "wapiti"],
                        tags: ["mammal", "herbivore", "prey"],
                        properties: {
                          scientificName: "Cervus canadensis",
                          diet: "herbivorous",
                        },
                      },
                      {
                        uid: "location:yellowstone",
                        type: "Location",
                        name: "Yellowstone National Park",
                        aliases: ["Yellowstone"],
                        tags: ["national_park", "protected_area"],
                        properties: {},
                      },
                    ],
                    relationships: [
                      {
                        uid: "rel:wolf_hunts_elk",
                        type: "HUNTS",
                        source: "animal:gray_wolf",
                        target: "animal:elk",
                        properties: {
                          huntingMethod: "pack_hunting",
                          confidence: 0.95,
                        },
                      },
                      {
                        uid: "rel:wolf_inhabits_yellowstone",
                        type: "INHABITS",
                        source: "animal:gray_wolf",
                        target: "location:yellowstone",
                        properties: {
                          reintroductionDate: "1995",
                          confidence: 0.95,
                        },
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
      </div>
    </details>
  );
}
