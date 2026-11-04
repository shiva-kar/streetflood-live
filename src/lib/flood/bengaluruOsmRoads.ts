// Authoritative OpenStreetMap road network for Bengaluru Urban
// Preloaded arterial, secondary, and flood-prone corridors
// (BBMP Central, East, West, South, Mahadevapura, Bommanahalli, Yelahanka, RR Nagar)

import type { OsmRoadSegment } from "./osmNetwork";

const CELL_DLAT = 0.0009; // ≈ 100m north-south

function assignTileIds(coords: [number, number][]): string[] {
  const set = new Set<string>();
  for (const [lat, lng] of coords) {
    const rad = (Math.abs(lat) * Math.PI) / 180;
    const cos = Math.max(0.2, Math.cos(rad));
    const dLng = 0.0009 / cos;
    const row = Math.floor(lat / CELL_DLAT);
    const col = Math.floor(lng / dLng);
    set.add(`t_${row}_${col}`);
  }
  return Array.from(set);
}

export const BENGALURU_OSM_ROADS: OsmRoadSegment[] = [
  // ---------------------------------------------------------------------------
  // 1. OUTER RING ROAD (ORR) - SOUTH & EAST TECH CORRIDOR
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_orr_silk_board_agara",
    osmId: 30101,
    name: "Outer Ring Road (Silk Board to Agara)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2800,
    coordinates: [
      [12.9172, 77.6228],
      [12.9185, 77.6295],
      [12.9202, 77.6385],
      [12.9220, 77.6450],
      [12.9234, 77.6515],
    ],
    tileIds: assignTileIds([
      [12.9172, 77.6228],
      [12.9185, 77.6295],
      [12.9202, 77.6385],
      [12.9220, 77.6450],
      [12.9234, 77.6515],
    ]),
  },
  {
    id: "blr_road_orr_agara_iblur",
    osmId: 30102,
    name: "Outer Ring Road (Agara to Iblur)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1900,
    coordinates: [
      [12.9234, 77.6515],
      [12.9238, 77.6580],
      [12.9242, 77.6640],
      [12.9248, 77.6695],
    ],
    tileIds: assignTileIds([
      [12.9234, 77.6515],
      [12.9238, 77.6580],
      [12.9242, 77.6640],
      [12.9248, 77.6695],
    ]),
  },
  {
    id: "blr_road_orr_iblur_bellandur",
    osmId: 30103,
    name: "Outer Ring Road (Iblur to Bellandur Gate)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1600,
    coordinates: [
      [12.9248, 77.6695],
      [12.9255, 77.6740],
      [12.9260, 77.6780],
      [12.9265, 77.6835],
    ],
    tileIds: assignTileIds([
      [12.9248, 77.6695],
      [12.9255, 77.6740],
      [12.9260, 77.6780],
      [12.9265, 77.6835],
    ]),
  },
  {
    id: "blr_road_orr_ecospace_underpass",
    osmId: 30104,
    name: "Outer Ring Road (EcoSpace Underpass & Service Road)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1200,
    coordinates: [
      [12.9265, 77.6835],
      [12.9275, 77.6840],
      [12.9290, 77.6865],
      [12.9305, 77.6890],
      [12.9320, 77.6910],
    ],
    tileIds: assignTileIds([
      [12.9265, 77.6835],
      [12.9275, 77.6840],
      [12.9290, 77.6865],
      [12.9305, 77.6890],
      [12.9320, 77.6910],
    ]),
  },
  {
    id: "blr_road_orr_devarabeesanahalli",
    osmId: 30105,
    name: "Outer Ring Road (Devarabeesanahalli to Kadubeesanahalli)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1400,
    coordinates: [
      [12.9320, 77.6910],
      [12.9335, 77.6935],
      [12.9355, 77.6970],
      [12.9380, 77.6990],
    ],
    tileIds: assignTileIds([
      [12.9320, 77.6910],
      [12.9335, 77.6935],
      [12.9355, 77.6970],
      [12.9380, 77.6990],
    ]),
  },
  {
    id: "blr_road_orr_kadubeesanahalli_marathahalli",
    osmId: 30106,
    name: "Outer Ring Road (Kadubeesanahalli to Marathahalli Bridge)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2300,
    coordinates: [
      [12.9380, 77.6990],
      [12.9430, 77.7005],
      [12.9490, 77.7010],
      [12.9555, 77.7012],
    ],
    tileIds: assignTileIds([
      [12.9380, 77.6990],
      [12.9430, 77.7005],
      [12.9490, 77.7010],
      [12.9555, 77.7012],
    ]),
  },
  {
    id: "blr_road_orr_marathahalli_mahadevapura",
    osmId: 30107,
    name: "Outer Ring Road (Marathahalli to Mahadevapura)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2600,
    coordinates: [
      [12.9555, 77.7012],
      [12.9640, 77.7010],
      [12.9710, 77.7008],
      [12.9780, 77.7005],
    ],
    tileIds: assignTileIds([
      [12.9555, 77.7012],
      [12.9640, 77.7010],
      [12.9710, 77.7008],
      [12.9780, 77.7005],
    ]),
  },
  {
    id: "blr_road_orr_mahadevapura_kr_puram",
    osmId: 30108,
    name: "Outer Ring Road (Mahadevapura to KR Puram Hanging Bridge)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2700,
    coordinates: [
      [12.9780, 77.7005],
      [12.9850, 77.6990],
      [12.9920, 77.6940],
      [12.9980, 77.6880],
    ],
    tileIds: assignTileIds([
      [12.9780, 77.7005],
      [12.9850, 77.6990],
      [12.9920, 77.6940],
      [12.9980, 77.6880],
    ]),
  },
  {
    id: "blr_road_orr_kr_puram_tin_factory",
    osmId: 30109,
    name: "Outer Ring Road (KR Puram to Tin Factory / Benniganahalli)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1800,
    coordinates: [
      [12.9980, 77.6880],
      [13.0010, 77.6780],
      [13.0030, 77.6680],
    ],
    tileIds: assignTileIds([
      [12.9980, 77.6880],
      [13.0010, 77.6780],
      [13.0030, 77.6680],
    ]),
  },
  {
    id: "blr_road_orr_tin_factory_kalyan_nagar",
    osmId: 30110,
    name: "Outer Ring Road (Tin Factory to Kalyan Nagar / HRBR)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3200,
    coordinates: [
      [13.0030, 77.6680],
      [13.0110, 77.6640],
      [13.0180, 77.6580],
      [13.0230, 77.6430],
    ],
    tileIds: assignTileIds([
      [13.0030, 77.6680],
      [13.0110, 77.6640],
      [13.0180, 77.6580],
      [13.0230, 77.6430],
    ]),
  },
  {
    id: "blr_road_orr_kalyan_nagar_nagawara",
    osmId: 30111,
    name: "Outer Ring Road (Kalyan Nagar to Nagawara / Manyata)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3100,
    coordinates: [
      [13.0230, 77.6430],
      [13.0270, 77.6320],
      [13.0310, 77.6250],
      [13.0360, 77.6180],
    ],
    tileIds: assignTileIds([
      [13.0230, 77.6430],
      [13.0270, 77.6320],
      [13.0310, 77.6250],
      [13.0360, 77.6180],
    ]),
  },
  {
    id: "blr_road_orr_nagawara_hebbal",
    osmId: 30112,
    name: "Outer Ring Road (Nagawara to Hebbal Flyover Junction)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2600,
    coordinates: [
      [13.0360, 77.6180],
      [13.0375, 77.6080],
      [13.0365, 77.6020],
      [13.0358, 77.5970],
    ],
    tileIds: assignTileIds([
      [13.0360, 77.6180],
      [13.0375, 77.6080],
      [13.0365, 77.6020],
      [13.0358, 77.5970],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 2. CENTRAL SILK BOARD & HOSUR ROAD (NH 44 / ELEVATED EXPRESSWAY)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_silkboard_junction",
    osmId: 30201,
    name: "Central Silk Board Junction & Underpass",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 850,
    coordinates: [
      [12.9150, 77.6220],
      [12.9172, 77.6228],
      [12.9195, 77.6235],
    ],
    tileIds: assignTileIds([
      [12.9150, 77.6220],
      [12.9172, 77.6228],
      [12.9195, 77.6235],
    ]),
  },
  {
    id: "blr_road_hosur_silkboard_bommanahalli",
    osmId: 30202,
    name: "Hosur Road (Silk Board to Bommanahalli Junction)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1400,
    coordinates: [
      [12.9172, 77.6228],
      [12.9130, 77.6240],
      [12.9080, 77.6260],
    ],
    tileIds: assignTileIds([
      [12.9172, 77.6228],
      [12.9130, 77.6240],
      [12.9080, 77.6260],
    ]),
  },
  {
    id: "blr_road_hosur_bommanahalli_kudlu",
    osmId: 30203,
    name: "Hosur Road (Bommanahalli to Kudlu Gate & Singasandra)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3800,
    coordinates: [
      [12.9080, 77.6260],
      [12.8980, 77.6330],
      [12.8900, 77.6410],
      [12.8780, 77.6500],
    ],
    tileIds: assignTileIds([
      [12.9080, 77.6260],
      [12.8980, 77.6330],
      [12.8900, 77.6410],
      [12.8780, 77.6500],
    ]),
  },
  {
    id: "blr_road_hosur_singasandra_ecity",
    osmId: 30204,
    name: "Hosur Road (Singasandra to Electronic City Phase 1 Toll)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 4200,
    coordinates: [
      [12.8780, 77.6500],
      [12.8680, 77.6590],
      [12.8550, 77.6620],
      [12.8450, 77.6650],
    ],
    tileIds: assignTileIds([
      [12.8780, 77.6500],
      [12.8680, 77.6590],
      [12.8550, 77.6620],
      [12.8450, 77.6650],
    ]),
  },
  {
    id: "blr_road_hosur_madiwala_forum",
    osmId: 30205,
    name: "Hosur Road (Silk Board to Madiwala & Forum Mall)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2600,
    coordinates: [
      [12.9172, 77.6228],
      [12.9220, 77.6180],
      [12.9280, 77.6150],
      [12.9340, 77.6120],
    ],
    tileIds: assignTileIds([
      [12.9172, 77.6228],
      [12.9220, 77.6180],
      [12.9280, 77.6150],
      [12.9340, 77.6120],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 3. KORAMANGALA CIVIC CORRIDORS (80ft & 100ft ROADS)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_koramangala_80ft",
    osmId: 30301,
    name: "Koramangala 80ft Road (Wipro Park to Sony World Junction)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1700,
    coordinates: [
      [12.9420, 77.6200],
      [12.9380, 77.6220],
      [12.9348, 77.6240],
      [12.9310, 77.6300],
    ],
    tileIds: assignTileIds([
      [12.9420, 77.6200],
      [12.9380, 77.6220],
      [12.9348, 77.6240],
      [12.9310, 77.6300],
    ]),
  },
  {
    id: "blr_road_koramangala_100ft",
    osmId: 30302,
    name: "100 Feet Intermediate Ring Road (Domlur to Koramangala)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3100,
    coordinates: [
      [12.9610, 77.6400],
      [12.9520, 77.6380],
      [12.9420, 77.6320],
      [12.9340, 77.6280],
    ],
    tileIds: assignTileIds([
      [12.9610, 77.6400],
      [12.9520, 77.6380],
      [12.9420, 77.6320],
      [12.9340, 77.6280],
    ]),
  },
  {
    id: "blr_road_koramangala_jnc",
    osmId: 30303,
    name: "Jyoti Nivas College (JNC) Road / 5th Block",
    highway: "secondary",
    isMajor: false,
    isOneWay: false,
    lengthMeters: 800,
    coordinates: [
      [12.9320, 77.6170],
      [12.9335, 77.6190],
      [12.9345, 77.6210],
    ],
    tileIds: assignTileIds([
      [12.9320, 77.6170],
      [12.9335, 77.6190],
      [12.9345, 77.6210],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 4. SARJAPUR ROAD CORRIDOR
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_sarjapur_stjohns_agara",
    osmId: 30401,
    name: "Sarjapur Road (St. John's Hospital to Agara Lake)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3400,
    coordinates: [
      [12.9310, 77.6190],
      [12.9290, 77.6260],
      [12.9270, 77.6350],
      [12.9240, 77.6480],
      [12.9248, 77.6530],
    ],
    tileIds: assignTileIds([
      [12.9310, 77.6190],
      [12.9290, 77.6260],
      [12.9270, 77.6350],
      [12.9240, 77.6480],
      [12.9248, 77.6530],
    ]),
  },
  {
    id: "blr_road_sarjapur_iblur_kaikondrahalli",
    osmId: 30402,
    name: "Sarjapur Road (Iblur to Kaikondrahalli Lake)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2200,
    coordinates: [
      [12.9248, 77.6695],
      [12.9220, 77.6740],
      [12.9180, 77.6790],
      [12.9130, 77.6830],
    ],
    tileIds: assignTileIds([
      [12.9248, 77.6695],
      [12.9220, 77.6740],
      [12.9180, 77.6790],
      [12.9130, 77.6830],
    ]),
  },
  {
    id: "blr_road_sarjapur_carmelaram_wipro",
    osmId: 30403,
    name: "Sarjapur Road (Kaikondrahalli to Carmelaram & Wipro Campus)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3100,
    coordinates: [
      [12.9130, 77.6830],
      [12.9090, 77.6970],
      [12.9070, 77.7050],
      [12.9050, 77.7150],
    ],
    tileIds: assignTileIds([
      [12.9130, 77.6830],
      [12.9090, 77.6970],
      [12.9070, 77.7050],
      [12.9050, 77.7150],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 5. OLD AIRPORT ROAD & HAL CORRIDOR
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_old_airport_trinity_domlur",
    osmId: 30501,
    name: "Old Airport Road (Trinity Circle to Domlur Flyover)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2900,
    coordinates: [
      [12.9710, 77.6180],
      [12.9660, 77.6270],
      [12.9620, 77.6380],
    ],
    tileIds: assignTileIds([
      [12.9710, 77.6180],
      [12.9660, 77.6270],
      [12.9620, 77.6380],
    ]),
  },
  {
    id: "blr_road_old_airport_domlur_hal",
    osmId: 30502,
    name: "Old Airport Road (Domlur to Manipal Hospital & HAL)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3600,
    coordinates: [
      [12.9620, 77.6380],
      [12.9590, 77.6480],
      [12.9570, 77.6600],
      [12.9550, 77.6760],
    ],
    tileIds: assignTileIds([
      [12.9620, 77.6380],
      [12.9590, 77.6480],
      [12.9570, 77.6600],
      [12.9550, 77.6760],
    ]),
  },
  {
    id: "blr_road_old_airport_hal_marathahalli",
    osmId: 30503,
    name: "Old Airport Road (HAL to Marathahalli Underpass)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2600,
    coordinates: [
      [12.9550, 77.6760],
      [12.9552, 77.6880],
      [12.9555, 77.7012],
    ],
    tileIds: assignTileIds([
      [12.9550, 77.6760],
      [12.9552, 77.6880],
      [12.9555, 77.7012],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 6. INDIRANAGAR CORRIDORS (100ft Road & CMH Road)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_indiranagar_100ft",
    osmId: 30601,
    name: "100 Feet Road Indiranagar (Old Madras Road to Domlur)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2200,
    coordinates: [
      [12.9780, 77.6410],
      [12.9720, 77.6410],
      [12.9680, 77.6410],
      [12.9640, 77.6410],
    ],
    tileIds: assignTileIds([
      [12.9780, 77.6410],
      [12.9720, 77.6410],
      [12.9680, 77.6410],
      [12.9640, 77.6410],
    ]),
  },
  {
    id: "blr_road_indiranagar_cmh",
    osmId: 30602,
    name: "CMH Road (Chinmaya Mission Hospital Road)",
    highway: "secondary",
    isMajor: false,
    isOneWay: false,
    lengthMeters: 1600,
    coordinates: [
      [12.9780, 77.6320],
      [12.9780, 77.6410],
      [12.9780, 77.6480],
    ],
    tileIds: assignTileIds([
      [12.9780, 77.6320],
      [12.9780, 77.6410],
      [12.9780, 77.6480],
    ]),
  },
  {
    id: "blr_road_indiranagar_12th_main",
    osmId: 30603,
    name: "12th Main Road Indiranagar (HAL 2nd Stage)",
    highway: "secondary",
    isMajor: false,
    isOneWay: false,
    lengthMeters: 1200,
    coordinates: [
      [12.9720, 77.6400],
      [12.9690, 77.6400],
      [12.9660, 77.6400],
    ],
    tileIds: assignTileIds([
      [12.9720, 77.6400],
      [12.9690, 77.6400],
      [12.9660, 77.6400],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 7. CENTRAL BUSINESS DISTRICT & KANTEERAVA
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_mg_road",
    osmId: 30701,
    name: "Mahatma Gandhi (MG) Road",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2100,
    coordinates: [
      [12.9750, 77.6040],
      [12.9740, 77.6100],
      [12.9730, 77.6200],
    ],
    tileIds: assignTileIds([
      [12.9750, 77.6040],
      [12.9740, 77.6100],
      [12.9730, 77.6200],
    ]),
  },
  {
    id: "blr_road_kasturba_kanteerava",
    osmId: 30702,
    name: "Kasturba Road (Kanteerava Stadium Perimeter)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 900,
    coordinates: [
      [12.9710, 77.5920],
      [12.9692, 77.5929],
      [12.9680, 77.5940],
    ],
    tileIds: assignTileIds([
      [12.9710, 77.5920],
      [12.9692, 77.5929],
      [12.9680, 77.5940],
    ]),
  },
  {
    id: "blr_road_hudson_circle_bbmp",
    osmId: 30703,
    name: "Hudson Circle / BBMP Head Office Corridor",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 800,
    coordinates: [
      [12.9695, 77.5875],
      [12.9698, 77.5878],
      [12.9690, 77.5930],
    ],
    tileIds: assignTileIds([
      [12.9695, 77.5875],
      [12.9698, 77.5878],
      [12.9690, 77.5930],
    ]),
  },
  {
    id: "blr_road_richmond_road",
    osmId: 30704,
    name: "Richmond Road (General K.S. Thimayya Road)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1700,
    coordinates: [
      [12.9660, 77.6000],
      [12.9650, 77.6080],
      [12.9640, 77.6150],
    ],
    tileIds: assignTileIds([
      [12.9660, 77.6000],
      [12.9650, 77.6080],
      [12.9640, 77.6150],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 8. BANNERGHATTA ROAD (DAIRY CIRCLE TO JAYADEVA & BTM)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_bannerghatta_dairy_jayadeva",
    osmId: 30801,
    name: "Bannerghatta Road (Dairy Circle to Jayadeva Underpass)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2300,
    coordinates: [
      [12.9360, 77.6000],
      [12.9270, 77.5990],
      [12.9180, 77.5990],
    ],
    tileIds: assignTileIds([
      [12.9360, 77.6000],
      [12.9270, 77.5990],
      [12.9180, 77.5990],
    ]),
  },
  {
    id: "blr_road_bannerghatta_jayadeva_bilekahalli",
    osmId: 30802,
    name: "Bannerghatta Road (Jayadeva Underpass to Bilekahalli)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2400,
    coordinates: [
      [12.9180, 77.5990],
      [12.9090, 77.6000],
      [12.8980, 77.6000],
    ],
    tileIds: assignTileIds([
      [12.9180, 77.5990],
      [12.9090, 77.6000],
      [12.8980, 77.6000],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 9. WHITEFIELD, ITPL & VARTHUR
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_whitefield_kundalahalli",
    osmId: 30901,
    name: "Whitefield Main Road (Marathahalli to Kundalahalli Gate)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2400,
    coordinates: [
      [12.9555, 77.7012],
      [12.9610, 77.7110],
      [12.9660, 77.7180],
    ],
    tileIds: assignTileIds([
      [12.9555, 77.7012],
      [12.9610, 77.7110],
      [12.9660, 77.7180],
    ]),
  },
  {
    id: "blr_road_itpl_main_road",
    osmId: 30902,
    name: "ITPL Main Road (Kundalahalli to Hope Farm / ITPL)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3800,
    coordinates: [
      [12.9660, 77.7180],
      [12.9750, 77.7280],
      [12.9830, 77.7340],
      [12.9880, 77.7380],
    ],
    tileIds: assignTileIds([
      [12.9660, 77.7180],
      [12.9750, 77.7280],
      [12.9830, 77.7340],
      [12.9880, 77.7380],
    ]),
  },
  {
    id: "blr_road_panathur_underpass",
    osmId: 30903,
    name: "Panathur Railway Underpass (S-Bend Corridor)",
    highway: "secondary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1400,
    coordinates: [
      [12.9355, 77.6970],
      [12.9370, 77.7030],
      [12.9390, 77.7090],
    ],
    tileIds: assignTileIds([
      [12.9355, 77.6970],
      [12.9370, 77.7030],
      [12.9390, 77.7090],
    ]),
  },
  {
    id: "blr_road_varthur_main_road",
    osmId: 30904,
    name: "Varthur Main Road (Gunjur to Varthur Lake)",
    highway: "secondary",
    isMajor: false,
    isOneWay: false,
    lengthMeters: 2900,
    coordinates: [
      [12.9390, 77.7090],
      [12.9410, 77.7120],
      [12.9430, 77.7250],
      [12.9435, 77.7350],
    ],
    tileIds: assignTileIds([
      [12.9390, 77.7090],
      [12.9410, 77.7120],
      [12.9430, 77.7250],
      [12.9435, 77.7350],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 10. BELLARY ROAD (AIRPORT CORRIDOR & HEBBAL)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_bellary_mekhri_circle",
    osmId: 31001,
    name: "Mekhri Circle Underpass & Bellary Road",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 1600,
    coordinates: [
      [12.9990, 77.5810],
      [13.0080, 77.5830],
      [13.0180, 77.5850],
    ],
    tileIds: assignTileIds([
      [12.9990, 77.5810],
      [13.0080, 77.5830],
      [13.0180, 77.5850],
    ]),
  },
  {
    id: "blr_road_bellary_hebbal_flyover",
    osmId: 31002,
    name: "Hebbal Flyover Elevated Arterial Link",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2200,
    coordinates: [
      [13.0180, 77.5850],
      [13.0280, 77.5910],
      [13.0358, 77.5970],
    ],
    tileIds: assignTileIds([
      [13.0180, 77.5850],
      [13.0280, 77.5910],
      [13.0358, 77.5970],
    ]),
  },
  {
    id: "blr_road_bellary_hebbal_yelahanka",
    osmId: 31003,
    name: "Bellary Road (Hebbal to Yelahanka Bypass)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 5500,
    coordinates: [
      [13.0358, 77.5970],
      [13.0550, 77.5960],
      [13.0780, 77.6000],
      [13.1000, 77.5960],
    ],
    tileIds: assignTileIds([
      [13.0358, 77.5970],
      [13.0550, 77.5960],
      [13.0780, 77.6000],
      [13.1000, 77.5960],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 11. WEST ZONE (MYSORE ROAD & RAJAJINAGAR)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_mysore_sirsi_circle",
    osmId: 31101,
    name: "Mysore Road / Sirsi Circle Flyover (City Market to Bapuji Nagar)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3500,
    coordinates: [
      [12.9630, 77.5750],
      [12.9580, 77.5600],
      [12.9540, 77.5450],
      [12.9460, 77.5250],
    ],
    tileIds: assignTileIds([
      [12.9630, 77.5750],
      [12.9580, 77.5600],
      [12.9540, 77.5450],
      [12.9460, 77.5250],
    ]),
  },
  {
    id: "blr_road_rajajinagar_chord_road",
    osmId: 31102,
    name: "West of Chord Road (Rajajinagar to Navrang Circle)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2800,
    coordinates: [
      [12.9880, 77.5540],
      [12.9960, 77.5530],
      [13.0040, 77.5510],
      [13.0100, 77.5520],
    ],
    tileIds: assignTileIds([
      [12.9880, 77.5540],
      [12.9960, 77.5530],
      [13.0040, 77.5510],
      [13.0100, 77.5520],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 12. SOUTH ZONE (KANAKAPURA ROAD & JAYANAGAR)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_kanakapura_southend_banashankari",
    osmId: 31201,
    name: "Kanakapura Road (South End Circle to Banashankari TTMC)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 2700,
    coordinates: [
      [12.9370, 77.5800],
      [12.9250, 77.5760],
      [12.9150, 77.5730],
    ],
    tileIds: assignTileIds([
      [12.9370, 77.5800],
      [12.9250, 77.5760],
      [12.9150, 77.5730],
    ]),
  },
  {
    id: "blr_road_kanakapura_banashankari_konanakunte",
    osmId: 31202,
    name: "Kanakapura Road (Banashankari to Konanakunte Cross)",
    highway: "primary",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 3200,
    coordinates: [
      [12.9150, 77.5730],
      [12.9060, 77.5740],
      [12.8980, 77.5720],
      [12.8880, 77.5710],
    ],
    tileIds: assignTileIds([
      [12.9150, 77.5730],
      [12.9060, 77.5740],
      [12.8980, 77.5720],
      [12.8880, 77.5710],
    ]),
  },

  // ---------------------------------------------------------------------------
  // 13. NORTH-WEST & INDUSTRIAL (TUMKUR ROAD / PEENYA)
  // ---------------------------------------------------------------------------
  {
    id: "blr_road_tumkur_yeshwanthpur_peenya",
    osmId: 31301,
    name: "Tumkur Road (Yeshwanthpur to Peenya Industrial Corridor)",
    highway: "trunk",
    isMajor: true,
    isOneWay: false,
    lengthMeters: 4500,
    coordinates: [
      [13.0230, 77.5500],
      [13.0290, 77.5400],
      [13.0350, 77.5250],
      [13.0450, 77.5100],
    ],
    tileIds: assignTileIds([
      [13.0230, 77.5500],
      [13.0290, 77.5400],
      [13.0350, 77.5250],
      [13.0450, 77.5100],
    ]),
  },
];
