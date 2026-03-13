import type { DomainConfig } from "../../domain-system";

import { ArtEntitySchema, validateArtUID, ART_UID_PREFIX } from "./art.schema";
import {
  AthleteEntitySchema,
  validateAthleteUID,
  ATHLETE_UID_PREFIX,
} from "./athlete.schema";
import {
  BookEntitySchema,
  validateBookUID,
  BOOK_UID_PREFIX,
} from "./book.schema";
import { culturalCardConfig } from "./card.config";
import {
  CharacterEntitySchema,
  validateCharacterUID,
  CHARACTER_UID_PREFIX,
} from "./character.schema";
import {
  CuisineEntitySchema,
  validateCuisineUID,
  CUISINE_UID_PREFIX,
} from "./cuisine.schema";
import {
  FilmEntitySchema,
  validateFilmUID,
  FILM_UID_PREFIX,
} from "./film.schema";
import {
  FoodEntitySchema,
  validateFoodUID,
  FOOD_UID_PREFIX,
} from "./food.schema";
import {
  GameEntitySchema,
  validateGameUID,
  GAME_UID_PREFIX,
} from "./game.schema";
import {
  LanguageEntitySchema,
  validateLanguageUID,
  LANGUAGE_UID_PREFIX,
} from "./language.schema";
import {
  RecipeEntitySchema,
  validateRecipeUID,
  RECIPE_UID_PREFIX,
} from "./recipe.schema";
import {
  ReligionEntitySchema,
  validateReligionUID,
  RELIGION_UID_PREFIX,
} from "./religion.schema";
import {
  SongEntitySchema,
  validateSongUID,
  SONG_UID_PREFIX,
} from "./song.schema";
import {
  SportEntitySchema,
  validateSportUID,
  SPORT_UID_PREFIX,
} from "./sport.schema";
import {
  StadiumEntitySchema,
  validateStadiumUID,
  STADIUM_UID_PREFIX,
} from "./stadium.schema";
import {
  TeamEntitySchema,
  validateTeamUID,
  TEAM_UID_PREFIX,
} from "./team.schema";
import {
  TheaterEntitySchema,
  validateTheaterUID,
  THEATER_UID_PREFIX,
} from "./theater.schema";
import {
  TraditionEntitySchema,
  validateTraditionUID,
  TRADITION_UID_PREFIX,
} from "./tradition.schema";
import {
  TVShowEntitySchema,
  validateTVShowUID,
  TV_SHOW_UID_PREFIX,
} from "./tv-show.schema";

export const culturalDomainConfig: DomainConfig = {
  name: "cultural",
  displayName: "Cultural",
  description: "Cultural domain entities",
  category: "core",

  entities: {
    Book: BookEntitySchema,
    Film: FilmEntitySchema,
    Song: SongEntitySchema,
    Art: ArtEntitySchema,
    Language: LanguageEntitySchema,
    Religion: ReligionEntitySchema,
    Tradition: TraditionEntitySchema,
    Athlete: AthleteEntitySchema,
    Character: CharacterEntitySchema,
    Cuisine: CuisineEntitySchema,
    Food: FoodEntitySchema,
    Game: GameEntitySchema,
    Recipe: RecipeEntitySchema,
    Sport: SportEntitySchema,
    Stadium: StadiumEntitySchema,
    Team: TeamEntitySchema,
    Theater: TheaterEntitySchema,
    TV_Show: TVShowEntitySchema,
  },

  enrichmentExamples: {
    Book: {
      input_text:
        "To Kill a Mockingbird is a novel by Harper Lee published in 1960. The book won the Pulitzer Prize in 1961 and is set in the fictional town of Maycomb, Alabama.",
      expected_output: {
        author: "Harper Lee",
        publishedYear: "1960",
        genre: "novel",
        awards: ["Pulitzer Prize"],
      },
    },
    Film: {
      input_text:
        "The Godfather is a 1972 crime film directed by Francis Ford Coppola. The film was produced by Paramount Pictures and stars Marlon Brando as Vito Corleone.",
      expected_output: {
        releaseYear: "1972",
        director: "Francis Ford Coppola",
        genre: "crime",
        studio: "Paramount Pictures",
      },
    },
    Song: {
      input_text:
        "Imagine is a song by John Lennon released in 1971. The song appears on the album of the same name and has become an enduring anthem for peace.",
      expected_output: {
        artist: "John Lennon",
        releaseYear: "1971",
        album: "Imagine",
        genre: "rock",
      },
    },
    Art: {
      input_text:
        "The Mona Lisa is an oil painting by Leonardo da Vinci created between 1503-1519. The portrait measures 77cm by 53cm and is currently housed at the Louvre Museum in Paris. It is considered one of the most famous paintings in the world.",
      expected_output: {
        medium: ["oil_painting"],
        creationDate: "1503-1519",
        period: "Renaissance",
        currentLocation: "Louvre Museum",
        dimensions: { height: 77, width: 53 },
        significance: "most famous paintings in the world",
      },
    },
    Language: {
      input_text:
        "Mandarin Chinese is the most widely spoken language in the world with over 900 million native speakers. It belongs to the Sino-Tibetan language family and uses Chinese characters as its writing system. It is the official language of China.",
      expected_output: {
        family: "Sino-Tibetan",
        speakers: { native: 900000000 },
        writingSystem: ["Chinese characters"],
        officialStatus: ["China"],
        status: "living",
      },
    },
    Religion: {
      input_text:
        "Buddhism originated in ancient India around the 5th century BCE, founded by Siddhartha Gautama. It has approximately 500 million followers worldwide and includes major branches such as Theravada and Mahayana.",
      expected_output: {
        founded: "5th century BCE",
        founder: "Siddhartha Gautama",
        followers: 500000000,
        origin: "ancient India",
        branches: ["Theravada", "Mahayana"],
      },
    },
    Tradition: {
      input_text:
        "The Japanese tea ceremony (Chanoyu) is a traditional cultural practice that originated in the 9th century. It emphasizes harmony, respect, purity, and tranquility, and is practiced primarily in Japan and surrounding regions.",
      expected_output: {
        origin: "Japan",
        period: "9th century",
        culturalSignificance: "harmony, respect, purity, and tranquility",
        practiceRegions: ["Japan"],
      },
    },
    Athlete: {
      input_text:
        "Michael Jordan played basketball for the Chicago Bulls from 1984 to 1998 (with a brief retirement). He wore jersey number 23, won 6 NBA championships, and is considered one of the greatest basketball players of all time.",
      expected_output: {
        sports: ["basketball"],
        position: "shooting guard",
        jersey_number: 23,
        career_start: "1984",
        career_end: "1998",
        current_team: "Chicago Bulls",
        achievements: ["6 NBA championships"],
      },
    },
    Character: {
      input_text:
        "Sherlock Holmes is a fictional detective created by Sir Arthur Conan Doyle in 1887. The character first appeared in 'A Study in Scarlet' and is known for exceptional deductive reasoning and residence at 221B Baker Street.",
      expected_output: {
        creator: "Sir Arthur Conan Doyle",
        firstAppearance: "1887",
        work: "A Study in Scarlet",
        characterType: "detective",
        traits: ["exceptional deductive reasoning"],
      },
    },
    Cuisine: {
      input_text:
        "Italian cuisine originated in Italy and is characterized by its emphasis on fresh ingredients, olive oil, tomatoes, and pasta. It has influenced culinary traditions worldwide and includes regional variations like Tuscan and Sicilian cooking.",
      expected_output: {
        origin: "Italy",
        characteristics: [
          "fresh ingredients",
          "olive oil",
          "tomatoes",
          "pasta",
        ],
        regionalVariations: ["Tuscan", "Sicilian"],
        influence: "worldwide",
      },
    },
    Food: {
      input_text:
        "Sushi is a traditional Japanese dish consisting of vinegared rice combined with raw fish or seafood. It originated in Southeast Asia as a method of preserving fish and became popular in Japan during the Edo period.",
      expected_output: {
        origin: "Southeast Asia",
        cuisine: "Japanese",
        primaryIngredients: ["vinegared rice", "raw fish", "seafood"],
        period: "Edo period",
      },
    },
    Game: {
      input_text:
        "Chess is a strategic board game played on an 8x8 grid with 16 pieces per player. It originated in India around the 6th century AD and spread worldwide, becoming one of the most popular strategy games.",
      expected_output: {
        gameType: "board game",
        origin: "India",
        period: "6th century AD",
        players: 2,
        characteristics: ["strategic", "8x8 grid"],
      },
    },
    Recipe: {
      input_text:
        "Chocolate chip cookies were invented by Ruth Wakefield in 1938 at the Toll House Inn. The recipe requires flour, butter, sugar, eggs, and chocolate chips, with a baking time of 10-12 minutes at 375°F.",
      expected_output: {
        inventor: "Ruth Wakefield",
        yearCreated: "1938",
        origin: "Toll House Inn",
        ingredients: ["flour", "butter", "sugar", "eggs", "chocolate chips"],
        cookingTime: "10-12 minutes",
        temperature: "375°F",
      },
    },
    Sport: {
      input_text:
        "Soccer (football) is the world's most popular sport with over 4 billion fans. It originated in England in the 19th century and is played professionally in leagues worldwide, including the Premier League and La Liga.",
      expected_output: {
        origin: "England",
        period: "19th century",
        popularity: 4000000000,
        professionalLeagues: ["Premier League", "La Liga"],
        playerCount: 11,
      },
    },
    Stadium: {
      input_text:
        "Camp Nou in Barcelona, Spain opened in 1957 with a capacity of 99,354 spectators. It is the home stadium of FC Barcelona and hosts football matches, concerts, and other events.",
      expected_output: {
        location: "Barcelona, Spain",
        opened: "1957",
        capacity: 99354,
        homeTeam: "FC Barcelona",
        sport: "football",
        uses: ["football matches", "concerts", "events"],
      },
    },
    Team: {
      input_text:
        "The New York Yankees were founded in 1903 and compete in Major League Baseball. The team has won 27 World Series championships and plays home games at Yankee Stadium in the Bronx, New York.",
      expected_output: {
        founded: "1903",
        sport: "baseball",
        league: "Major League Baseball",
        championships: 27,
        homeStadium: "Yankee Stadium",
        location: "Bronx, New York",
      },
    },
    Theater: {
      input_text:
        "The Globe Theatre in London was built in 1599 and was associated with William Shakespeare. The original theater was destroyed by fire in 1613, but a reconstruction opened in 1997 near the original site.",
      expected_output: {
        location: "London",
        opened: "1599",
        associatedWith: ["William Shakespeare"],
        capacity: 3000,
        destroyed: "1613",
        reconstructed: "1997",
      },
    },
    TV_Show: {
      input_text:
        "Breaking Bad is a crime drama television series created by Vince Gilligan. It aired from 2008 to 2013 on AMC for 5 seasons and won 16 Emmy Awards, including Outstanding Drama Series.",
      expected_output: {
        creator: "Vince Gilligan",
        genre: "crime drama",
        network: "AMC",
        firstAired: "2008",
        lastAired: "2013",
        seasons: 5,
        awards: ["16 Emmy Awards", "Outstanding Drama Series"],
      },
    },
  },

  relationshipExample: {
    input_text:
      "The Mona Lisa was created by Leonardo da Vinci during the Renaissance. Meryl Streep performed in The Iron Lady film and won an Academy Award. William Shakespeare wrote Hamlet, which was performed at the Globe Theatre in London. The 2024 World Cup was hosted in Qatar at Lusail Stadium. Cristiano Ronaldo plays for the Portugal national football team. English is spoken by billions worldwide and is based on Germanic roots. The film 'Oppenheimer' features actor Robert Downey Jr. The Beatles' song 'Hey Jude' was featured in the documentary 'Get Back.'",
    expected_output: {
      relationships: [
        {
          source_entity: "Mona Lisa",
          target_entity: "Leonardo da Vinci",
          relationship_type: "CREATED_BY",
          confidence: 0.99,
        },
        {
          source_entity: "Meryl Streep",
          target_entity: "The Iron Lady",
          relationship_type: "PERFORMS",
          confidence: 0.97,
        },
        {
          source_entity: "William Shakespeare",
          target_entity: "Hamlet",
          relationship_type: "CREATED_BY",
          confidence: 0.98,
        },
        {
          source_entity: "Hamlet",
          target_entity: "Globe Theatre",
          relationship_type: "PERFORMS",
          confidence: 0.89,
        },
        {
          source_entity: "2024 World Cup",
          target_entity: "Qatar",
          relationship_type: "HOSTED_AT",
          confidence: 0.99,
        },
        {
          source_entity: "Cristiano Ronaldo",
          target_entity: "Portugal national football team",
          relationship_type: "PLAYS_FOR",
          confidence: 0.96,
        },
        {
          source_entity: "English language",
          target_entity: "Germanic language family",
          relationship_type: "BASED_ON",
          confidence: 0.91,
        },
        {
          source_entity: "Oppenheimer",
          target_entity: "Robert Downey Jr.",
          relationship_type: "FEATURES",
          confidence: 0.94,
        },
        {
          source_entity: "Hey Jude",
          target_entity: "Get Back documentary",
          relationship_type: "FEATURES",
          confidence: 0.88,
        },
        {
          source_entity: "Portugal",
          target_entity: "Portuguese language",
          relationship_type: "SPEAKS",
          confidence: 0.92,
        },
      ],
    },
  },

  uidPrefixes: {
    Book: BOOK_UID_PREFIX,
    Film: FILM_UID_PREFIX,
    Song: SONG_UID_PREFIX,
    Art: ART_UID_PREFIX,
    Language: LANGUAGE_UID_PREFIX,
    Religion: RELIGION_UID_PREFIX,
    Tradition: TRADITION_UID_PREFIX,
    Athlete: ATHLETE_UID_PREFIX,
    Character: CHARACTER_UID_PREFIX,
    Cuisine: CUISINE_UID_PREFIX,
    Food: FOOD_UID_PREFIX,
    Game: GAME_UID_PREFIX,
    Recipe: RECIPE_UID_PREFIX,
    Sport: SPORT_UID_PREFIX,
    Stadium: STADIUM_UID_PREFIX,
    Team: TEAM_UID_PREFIX,
    Theater: THEATER_UID_PREFIX,
    TV_Show: TV_SHOW_UID_PREFIX,
  },

  validators: {
    [BOOK_UID_PREFIX]: validateBookUID,
    [FILM_UID_PREFIX]: validateFilmUID,
    [SONG_UID_PREFIX]: validateSongUID,
    [ART_UID_PREFIX]: validateArtUID,
    [LANGUAGE_UID_PREFIX]: validateLanguageUID,
    [RELIGION_UID_PREFIX]: validateReligionUID,
    [TRADITION_UID_PREFIX]: validateTraditionUID,
    [ATHLETE_UID_PREFIX]: validateAthleteUID,
    [CHARACTER_UID_PREFIX]: validateCharacterUID,
    [CUISINE_UID_PREFIX]: validateCuisineUID,
    [FOOD_UID_PREFIX]: validateFoodUID,
    [GAME_UID_PREFIX]: validateGameUID,
    [RECIPE_UID_PREFIX]: validateRecipeUID,
    [SPORT_UID_PREFIX]: validateSportUID,
    [STADIUM_UID_PREFIX]: validateStadiumUID,
    [TEAM_UID_PREFIX]: validateTeamUID,
    [THEATER_UID_PREFIX]: validateTheaterUID,
    [TV_SHOW_UID_PREFIX]: validateTVShowUID,
  },

  relationships: [
    "CREATED_BY",
    "PERFORMS",
    "FEATURES",
    "BASED_ON",
    "SPEAKS",
    "CELEBRATES",
    "PLAYS_FOR",
    "HOSTED_AT",
  ],

  ui: {
    color: "#EC4899",
    icon: "🎨",
    entityIcons: {
      Language: "🗣️",
      Religion: "🙏",
      Tradition: "🎭",
      Song: "🎵",
      Sport: "⚽",
      Stadium: "🏟️",
      Team: "👥",
      Holiday: "🎉",
      Theater: "🎭",
      Museum: "🏛️",
      Book: "📚",
      Film: "🎬",
      TVShow: "📺",
    },
    card: culturalCardConfig,
  },
};
