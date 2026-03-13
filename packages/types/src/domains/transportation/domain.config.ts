import type { DomainConfig } from "../../domain-system";

import {
  AircraftEntitySchema,
  validateAircraftUID,
  AIRCRAFT_UID_PREFIX,
} from "./aircraft.schema";
import { transportationCardConfig } from "./card.config";
import {
  RouteEntitySchema,
  validateRouteUID,
  ROUTE_UID_PREFIX,
} from "./route.schema";
import {
  ShipEntitySchema,
  validateShipUID,
  SHIP_UID_PREFIX,
} from "./ship.schema";
import {
  StationEntitySchema,
  validateStationUID,
  STATION_UID_PREFIX,
} from "./station.schema";
import {
  TrainEntitySchema,
  validateTrainUID,
  TRAIN_UID_PREFIX,
} from "./train.schema";
import {
  VehicleEntitySchema,
  validateVehicleUID,
  VEHICLE_UID_PREFIX,
} from "./vehicle.schema";

export const transportationDomainConfig: DomainConfig = {
  name: "transportation",
  displayName: "Transportation",
  description: "Transportation domain entities",
  category: "core",

  entities: {
    Vehicle: VehicleEntitySchema,
    Aircraft: AircraftEntitySchema,
    Ship: ShipEntitySchema,
    Train: TrainEntitySchema,
    Route: RouteEntitySchema,
    Station: StationEntitySchema,
  },

  enrichmentExamples: {
    Aircraft: {
      input_text:
        "The Boeing 747 is a wide-body commercial airliner developed by Boeing. The aircraft made its first flight in 1969 and can carry up to 524 passengers depending on configuration. It has become one of the most recognizable aircraft in aviation history.",
      expected_output: {
        name: "Boeing 747",
        manufacturer: "Boeing",
        firstFlight: "1969",
        capacity: 524,
        type: "wide-body commercial airliner",
      },
    },
    Ship: {
      input_text:
        "The RMS Titanic was a British passenger liner that sank in 1912 after striking an iceberg. The ship was built between 1909 and 1911 and had a displacement of 46,000 tonnes. It was considered unsinkable before its fatal voyage.",
      expected_output: {
        name: "RMS Titanic",
        country: "British",
        built: "1911",
        sank: "1912",
        displacement: 46000,
      },
    },
    Vehicle: {
      input_text:
        "The Ford Model T was an automobile produced from 1908 to 1927. It was manufactured by Ford Motor Company and sold over 15 million units. The car had a 4-cylinder engine and a top speed of 45 mph.",
      expected_output: {
        model: "Ford Model T",
        manufacturer: "Ford Motor Company",
        productionStart: "1908",
        productionEnd: "1927",
        unitsSold: 15000000,
        topSpeed: 45,
      },
    },
    Train: {
      input_text:
        "The Shinkansen bullet train in Japan began operation in 1964. These high-speed trains operate at speeds up to 320 km/h and have carried over 10 billion passengers since inception with an excellent safety record.",
      expected_output: {
        name: "Shinkansen",
        country: "Japan",
        inaugurated: "1964",
        maxSpeed: 320,
        passengerTotal: 10000000000,
        trainType: "high-speed",
      },
    },
    Route: {
      input_text:
        "Route 66 was a U.S. highway that ran from Chicago to Los Angeles, covering 2,448 miles. Established in 1926, it was one of the original highways in the U.S. Highway System and became a symbol of American culture.",
      expected_output: {
        routeName: "Route 66",
        origin: "Chicago",
        destination: "Los Angeles",
        length: 2448,
        established: "1926",
        significance: "symbol of American culture",
      },
    },
    Station: {
      input_text:
        "Grand Central Terminal in New York City opened in 1913 and serves over 250,000 commuters daily. The Beaux-Arts building features 44 platforms and is one of the world's busiest train stations.",
      expected_output: {
        stationName: "Grand Central Terminal",
        location: "New York City",
        opened: "1913",
        dailyPassengers: 250000,
        platforms: 44,
        architecture: "Beaux-Arts",
      },
    },
  },

  relationshipExample: {
    input_text:
      "The Shinkansen bullet train travels on railway routes connecting Tokyo and Osaka at 320 km/h. A Boeing 747 departs from Hartsfield-Jackson Airport daily for international destinations. Route 66 connects Chicago to Los Angeles, covering 2,448 miles. The RMS Titanic arrived at ports across the Atlantic before its fatal sinking. Grand Central Terminal in NYC serves over 250,000 commuters daily. Amtrak trains operate on routes connecting major US cities. The London Underground operates on multiple line routes serving the city. Port of Singapore serves as a major hub for maritime shipping routes.",
    expected_output: {
      relationships: [
        {
          source_entity: "Shinkansen",
          target_entity: "Tokyo-Osaka route",
          relationship_type: "TRAVELS_ON",
          confidence: 0.97,
        },
        {
          source_entity: "Boeing 747",
          target_entity: "Hartsfield-Jackson Airport",
          relationship_type: "DEPARTS_FROM",
          confidence: 0.96,
        },
        {
          source_entity: "Route 66",
          target_entity: "Chicago",
          relationship_type: "CONNECTS_TO",
          confidence: 0.95,
        },
        {
          source_entity: "Route 66",
          target_entity: "Los Angeles",
          relationship_type: "CONNECTS_TO",
          confidence: 0.95,
        },
        {
          source_entity: "RMS Titanic",
          target_entity: "Atlantic ports",
          relationship_type: "ARRIVES_AT",
          confidence: 0.91,
        },
        {
          source_entity: "Grand Central Terminal",
          target_entity: "NYC",
          relationship_type: "OPERATES_ON",
          confidence: 0.94,
        },
        {
          source_entity: "Amtrak",
          target_entity: "US rail routes",
          relationship_type: "OPERATES_ON",
          confidence: 0.93,
        },
        {
          source_entity: "London Underground",
          target_entity: "multiple line routes",
          relationship_type: "OPERATES_ON",
          confidence: 0.96,
        },
        {
          source_entity: "Port of Singapore",
          target_entity: "maritime shipping",
          relationship_type: "OPERATES_ON",
          confidence: 0.92,
        },
      ],
    },
  },

  uidPrefixes: {
    Vehicle: VEHICLE_UID_PREFIX,
    Aircraft: AIRCRAFT_UID_PREFIX,
    Ship: SHIP_UID_PREFIX,
    Train: TRAIN_UID_PREFIX,
    Route: ROUTE_UID_PREFIX,
    Station: STATION_UID_PREFIX,
  },

  validators: {
    [VEHICLE_UID_PREFIX]: validateVehicleUID,
    [AIRCRAFT_UID_PREFIX]: validateAircraftUID,
    [SHIP_UID_PREFIX]: validateShipUID,
    [TRAIN_UID_PREFIX]: validateTrainUID,
    [ROUTE_UID_PREFIX]: validateRouteUID,
    [STATION_UID_PREFIX]: validateStationUID,
  },

  relationships: [
    "TRAVELS_ON",
    "DEPARTS_FROM",
    "ARRIVES_AT",
    "OPERATES_ON",
    "CONNECTS_TO",
  ],

  ui: {
    color: "#6366F1",
    icon: "🚗",
    entityIcons: {
      Vehicle: "🚗",
      Aircraft: "✈️",
      Ship: "🚢",
      Train: "🚂",
      Route: "🗺️",
      Station: "🚉",
    },
    card: transportationCardConfig,
  },
};
