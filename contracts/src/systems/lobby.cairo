#[starknet::interface]
pub trait ILobby<T> {
    fn create_game(ref self: T, join_code: felt252) -> u32;
    fn join_game(ref self: T, game_id: u32, join_code: felt252);
}

#[dojo::contract]
pub mod lobby {
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use core::dict::{Felt252Dict, Felt252DictTrait};
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use unozap::models::game::{Game, GameCounter};
    use unozap::models::player::PlayerState;
    use unozap::models::card::{DeckCard, card_info};
    use super::ILobby;

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameCreated {
        #[key]
        pub game_id: u32,
        pub creator: ContractAddress,
        pub join_code: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerJoined {
        #[key]
        pub game_id: u32,
        pub player: ContractAddress,
        pub player_idx: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameStarted {
        #[key]
        pub game_id: u32,
        pub top_color: u8,
        pub top_value: u8,
    }

    #[abi(embed_v0)]
    impl LobbyImpl of ILobby<ContractState> {
        fn create_game(ref self: ContractState, join_code: felt252) -> u32 {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut counter: GameCounter = world.read_model(0_u8);
            let game_id = counter.count;
            counter.count += 1;
            world.write_model(@counter);

            let game = Game {
                game_id,
                creator: caller,
                join_code,
                player_count: 1,
                current_turn: 0,
                direction: 0,
                top_color: 0,
                top_value: 0,
                state: 0,
                winner: Zero::zero(),
                turn_deadline: 0,
                draw_index: 0,
                seed: 0,
            };
            world.write_model(@game);

            let player = PlayerState {
                game_id,
                player_idx: 0,
                address: caller,
                card_count: 0,
                has_drawn: false,
            };
            world.write_model(@player);

            world.emit_event(@GameCreated { game_id, creator: caller, join_code });

            game_id
        }

        fn join_game(ref self: ContractState, game_id: u32, join_code: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == 0, 'game not waiting');
            assert(game.join_code == join_code, 'wrong join code');
            assert(game.player_count < 2, 'game full');

            // Prevent duplicate joins
            let mut i: u8 = 0;
            loop {
                if i >= game.player_count {
                    break;
                }
                let existing: PlayerState = world.read_model((game_id, i));
                assert(existing.address != caller, 'already joined');
                i += 1;
            };

            let player_idx = game.player_count;
            world.write_model(@PlayerState {
                game_id,
                player_idx,
                address: caller,
                card_count: 0,
                has_drawn: false,
            });

            world.emit_event(@PlayerJoined { game_id, player: caller, player_idx });

            game.player_count += 1;

            if game.player_count == 2 {
                let seed = core::poseidon::poseidon_hash_span(
                    array![
                        get_block_timestamp().into(),
                        game_id.into(),
                        caller.into(),
                    ]
                        .span(),
                );
                game.seed = seed;

                initialize_deck(ref world, game_id, seed, game.player_count);

                // Read the starting discard card (position 14 for 2 players)
                let discard_pos: u8 = game.player_count * 7;
                let start_card: DeckCard = world.read_model((game_id, discard_pos));
                let mut top_color = start_card.card_color;
                let top_value = start_card.card_value;

                if top_color == 4 {
                    top_color = 0; // Wild defaults to red
                }

                game.top_color = top_color;
                game.top_value = top_value;
                game.draw_index = discard_pos + 1;
                game.state = 1;
                game.direction = 0;
                game.turn_deadline = get_block_timestamp() + 30;

                // Set card counts FIRST (before starting card effects modify them)
                let mut p: u8 = 0;
                loop {
                    if p >= game.player_count {
                        break;
                    }
                    let mut ps: PlayerState = world.read_model((game_id, p));
                    ps.card_count = 7;
                    world.write_model(@ps);
                    p += 1;
                };

                // Handle starting card effects
                game.current_turn = 0;
                if top_value == 10 {
                    game.current_turn = 1;
                } else if top_value == 11 {
                    game.direction = 1;
                    game.current_turn = game.player_count - 1;
                } else if top_value == 12 {
                    // Draw Two: player 0 draws 2 and is skipped
                    let mut d: u8 = 0;
                    loop {
                        if d >= 2 || game.draw_index >= 108 {
                            break;
                        }
                        let mut drawn: DeckCard = world.read_model((game_id, game.draw_index));
                        drawn.location = 2;
                        world.write_model(@drawn);
                        game.draw_index += 1;
                        d += 1;
                    };
                    let mut p0: PlayerState = world.read_model((game_id, 0_u8));
                    p0.card_count = 9; // 7 dealt + 2 penalty
                    world.write_model(@p0);
                    game.current_turn = 1;
                }

                world.emit_event(@GameStarted { game_id, top_color, top_value });
            }

            world.write_model(@game);
        }
    }

    fn initialize_deck(ref world: dojo::world::WorldStorage, game_id: u32, seed: felt252, player_count: u8) {
        // Fisher-Yates shuffle using Felt252Dict
        let mut deck: Felt252Dict<u8> = Default::default();
        let mut i: u8 = 0;
        loop {
            if i >= 108 {
                break;
            }
            deck.insert(i.into(), i);
            i += 1;
        };

        let mut current_seed = seed;
        let mut idx: u32 = 107;
        loop {
            if idx == 0 {
                break;
            }
            current_seed = core::poseidon::poseidon_hash_span(
                array![current_seed, idx.into()].span(),
            );
            let hash_u256: u256 = current_seed.into();
            let j: u32 = (hash_u256 % (idx + 1).into()).try_into().unwrap();

            let val_i = deck.get(idx.into());
            let val_j = deck.get(j.into());
            deck.insert(idx.into(), val_j);
            deck.insert(j.into(), val_i);

            idx -= 1;
        };

        // Create card models from shuffled deck
        let discard_pos: u8 = player_count * 7;
        let mut pos: u8 = 0;
        loop {
            if pos >= 108 {
                break;
            }
            let card_id = deck.get(pos.into());
            let (color, value) = card_info(card_id);

            // Assign location: first N*7 cards to player hands, then discard, then draw pile
            let location: u8 = if pos < discard_pos {
                (pos / 7) + 2 // player hands: location 2,3,4,...
            } else if pos == discard_pos {
                1 // discard pile
            } else {
                0 // draw pile
            };

            world.write_model(@DeckCard { game_id, card_index: pos, card_color: color, card_value: value, location });

            pos += 1;
        };
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"unozap")
        }
    }
}
