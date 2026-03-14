const TORII_URL = process.env.NEXT_PUBLIC_TORII_URL ?? 'http://localhost:8080';
const NAMESPACE = 'unozap';

interface GqlResponse<T> {
  data: T;
}

async function gqlQuery<T>(query: string): Promise<T> {
  const res = await fetch(`${TORII_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(`[torii] GraphQL request failed (${res.status}):`, body);
    throw new Error(`Torii query failed: ${res.status}`);
  }
  const json: GqlResponse<T> = await res.json();
  return json.data;
}

// Hex felt to number
function feltToNum(hex: string | null): number {
  if (!hex) return 0;
  return Number(BigInt(hex));
}

function feltToStr(hex: string | null): string {
  return hex ?? '0x0';
}

export interface GameData {
  gameId: number;
  creator: string;
  joinCode: string;
  playerCount: number;
  currentTurn: number;
  direction: number;
  topColor: number;
  topValue: number;
  state: number;
  winner: string;
  turnDeadline: number;
  drawIndex: number;
  seed: string;
}

export interface PlayerData {
  playerIdx: number;
  address: string;
  cardCount: number;
  hasDrawn: boolean;
}

export interface CardData {
  cardIndex: number;
  color: number;
  value: number;
  location: number;
}

export async function fetchGame(gameId: number): Promise<GameData | null> {
  const query = `{
    ${NAMESPACE}GameModels(where: { game_id: ${gameId} }, limit: 1) {
      edges {
        node {
          game_id
          creator
          join_code
          player_count
          current_turn
          direction
          top_color
          top_value
          state
          winner
          turn_deadline
          draw_index
          seed
        }
      }
    }
  }`;

  try {
    const data = await gqlQuery<any>(query);
    const edges = data[`${NAMESPACE}GameModels`]?.edges;
    if (!edges?.length) return null;
    const n = edges[0].node;
    return {
      gameId: feltToNum(n.game_id),
      creator: feltToStr(n.creator),
      joinCode: feltToStr(n.join_code),
      playerCount: feltToNum(n.player_count),
      currentTurn: feltToNum(n.current_turn),
      direction: feltToNum(n.direction),
      topColor: feltToNum(n.top_color),
      topValue: feltToNum(n.top_value),
      state: feltToNum(n.state),
      winner: feltToStr(n.winner),
      turnDeadline: feltToNum(n.turn_deadline),
      drawIndex: feltToNum(n.draw_index),
      seed: feltToStr(n.seed),
    };
  } catch (err) {
    console.warn('[torii] fetchGame failed:', err);
    return null;
  }
}

export async function fetchGameByCreator(creatorAddress: string): Promise<number | null> {
  const query = `{
    ${NAMESPACE}GameModels(where: { creator: "${creatorAddress}" }, limit: 10) {
      edges {
        node {
          game_id
          creator
        }
      }
    }
  }`;

  try {
    const data = await gqlQuery<any>(query);
    const edges = data[`${NAMESPACE}GameModels`]?.edges;
    if (!edges?.length) return null;
    // Return the highest game_id (most recent)
    let maxId = 0;
    for (const edge of edges) {
      const id = feltToNum(edge.node.game_id);
      if (id > maxId) maxId = id;
    }
    return maxId;
  } catch (err) {
    console.warn('[torii] fetchGameByCreator failed:', err);
    return null;
  }
}

export async function fetchPlayers(gameId: number): Promise<PlayerData[]> {
  const query = `{
    ${NAMESPACE}PlayerStateModels(where: { game_id: ${gameId} }, limit: 4) {
      edges {
        node {
          game_id
          player_idx
          address
          card_count
          has_drawn
        }
      }
    }
  }`;

  try {
    const data = await gqlQuery<any>(query);
    const edges = data[`${NAMESPACE}PlayerStateModels`]?.edges ?? [];
    return edges.map((e: any) => ({
      playerIdx: feltToNum(e.node.player_idx),
      address: feltToStr(e.node.address),
      cardCount: feltToNum(e.node.card_count),
      hasDrawn: e.node.has_drawn === true || e.node.has_drawn === 1,
    }));
  } catch (err) {
    console.warn('[torii] fetchPlayers failed:', err);
    return [];
  }
}

export async function fetchCards(gameId: number, location: number): Promise<CardData[]> {
  const query = `{
    ${NAMESPACE}DeckCardModels(where: { game_id: ${gameId}, location: ${location} }, limit: 108) {
      edges {
        node {
          game_id
          card_index
          card_color
          card_value
          location
        }
      }
    }
  }`;

  try {
    const data = await gqlQuery<any>(query);
    const edges = data[`${NAMESPACE}DeckCardModels`]?.edges ?? [];
    return edges.map((e: any) => ({
      cardIndex: feltToNum(e.node.card_index),
      color: feltToNum(e.node.card_color),
      value: feltToNum(e.node.card_value),
      location: feltToNum(e.node.location),
    }));
  } catch (err) {
    console.warn('[torii] fetchCards failed:', err);
    return [];
  }
}

export async function fetchMyCards(gameId: number, playerIdx: number): Promise<CardData[]> {
  return fetchCards(gameId, playerIdx + 2);
}

export async function fetchAllPlayerCards(gameId: number): Promise<CardData[]> {
  // Fetch cards for all 4 players + discard in parallel
  const results = await Promise.all(
    [1, 2, 3, 4, 5].map((loc) => fetchCards(gameId, loc)),
  );
  return results.flat();
}
