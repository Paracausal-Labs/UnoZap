#[starknet::interface]
pub trait IGameplay<T> {
    fn play_card(ref self: T, game_id: u32, card_index: u8, chosen_color: u8);
    fn draw_card(ref self: T, game_id: u32);
    fn pass_turn(ref self: T, game_id: u32);
    fn timeout_turn(ref self: T, game_id: u32);
}

#[dojo::contract]
pub mod gameplay {
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use unozap::models::game::Game;
    use unozap::models::player::PlayerState;
    use unozap::models::card::DeckCard;
    use super::IGameplay;

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct CardPlayed {
        #[key]
        pub game_id: u32,
        pub player_idx: u8,
        pub card_color: u8,
        pub card_value: u8,
        pub new_color: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct CardDrawn {
        #[key]
        pub game_id: u32,
        pub player_idx: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TurnSkipped {
        #[key]
        pub game_id: u32,
        pub player_idx: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameWon {
        #[key]
        pub game_id: u32,
        pub winner: ContractAddress,
        pub winner_idx: u8,
    }

    #[abi(embed_v0)]
    impl GameplayImpl of IGameplay<ContractState> {
        fn play_card(ref self: ContractState, game_id: u32, card_index: u8, chosen_color: u8) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == 1, 'game not active');

            let current_player: PlayerState = world.read_model((game_id, game.current_turn));
            assert(current_player.address == caller, 'not your turn');

            let mut card: DeckCard = world.read_model((game_id, card_index));
            let expected_loc = game.current_turn + 2;
            assert(card.location == expected_loc, 'not your card');

            // Wild cards (13, 14) can always be played
            // Regular cards must match color or value
            let is_wild = card.card_color == 4;
            let is_valid = is_wild
                || card.card_color == game.top_color
                || card.card_value == game.top_value;
            assert(is_valid, 'invalid play');

            // If player drew this turn, they can only play the drawn card
            // (the most recently added card to their hand)
            let player_state: PlayerState = world.read_model((game_id, game.current_turn));
            if player_state.has_drawn {
                // After drawing, only the drawn card or a previously held card matching is allowed
                // For simplicity: any valid card from hand is allowed after drawing
                // (strict UNO: only the drawn card, but this is a common house rule)
            }

            // Move card to discard
            card.location = 1;
            world.write_model(@card);

            // Set new top card
            let new_color = if card.card_color == 4 {
                assert(chosen_color < 4, 'bad color choice');
                chosen_color
            } else {
                card.card_color
            };
            game.top_color = new_color;
            game.top_value = card.card_value;

            // Update player
            let mut player: PlayerState = world.read_model((game_id, game.current_turn));
            player.card_count -= 1;
            player.has_drawn = false;
            world.write_model(@player);

            world.emit_event(@CardPlayed {
                game_id,
                player_idx: game.current_turn,
                card_color: card.card_color,
                card_value: card.card_value,
                new_color,
            });

            // Win check
            if player.card_count == 0 {
                game.state = 2;
                game.winner = caller;
                world.write_model(@game);
                world.emit_event(@GameWon {
                    game_id, winner: caller, winner_idx: game.current_turn,
                });
                return;
            }

            // Apply effects and advance turn
            let next = next_player(game.current_turn, game.direction, game.player_count);

            if card.card_value == 11 {
                // Reverse
                game.direction = if game.direction == 0 {
                    1
                } else {
                    0
                };
                let next_reversed = next_player(game.current_turn, game.direction, game.player_count);
                game.current_turn = next_reversed;
            } else if card.card_value == 10 {
                // Skip
                game.current_turn = next_player(next, game.direction, game.player_count);
            } else if card.card_value == 12 {
                // Draw Two
                draw_cards(ref world, game_id, next, 2, ref game);
                game.current_turn = next_player(next, game.direction, game.player_count);
            } else if card.card_value == 14 {
                // Wild Draw Four
                draw_cards(ref world, game_id, next, 4, ref game);
                game.current_turn = next_player(next, game.direction, game.player_count);
            } else {
                game.current_turn = next;
            }

            game.turn_deadline = get_block_timestamp() + 30;
            world.write_model(@game);
        }

        fn draw_card(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == 1, 'game not active');

            let mut player: PlayerState = world.read_model((game_id, game.current_turn));
            assert(player.address == caller, 'not your turn');
            assert(!player.has_drawn, 'already drew');
            assert(game.draw_index < 108, 'deck empty');

            let mut card: DeckCard = world.read_model((game_id, game.draw_index));
            card.location = game.current_turn + 2;
            world.write_model(@card);

            game.draw_index += 1;
            player.card_count += 1;
            player.has_drawn = true;

            world.write_model(@player);
            world.write_model(@game);

            world.emit_event(@CardDrawn { game_id, player_idx: game.current_turn });
        }

        fn pass_turn(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == 1, 'game not active');

            let mut player: PlayerState = world.read_model((game_id, game.current_turn));
            assert(player.address == caller, 'not your turn');
            assert(player.has_drawn, 'draw first');

            player.has_drawn = false;
            world.write_model(@player);

            game.current_turn = next_player(game.current_turn, game.direction, game.player_count);
            game.turn_deadline = get_block_timestamp() + 30;
            world.write_model(@game);
        }

        fn timeout_turn(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();

            let mut game: Game = world.read_model(game_id);
            assert(game.state == 1, 'game not active');
            assert(get_block_timestamp() > game.turn_deadline, 'not timed out');

            let timed_out_player = game.current_turn;

            // Auto-draw one card
            if game.draw_index < 108 {
                let mut card: DeckCard = world.read_model((game_id, game.draw_index));
                card.location = game.current_turn + 2;
                world.write_model(@card);

                game.draw_index += 1;

                let mut player: PlayerState = world.read_model((game_id, game.current_turn));
                player.card_count += 1;
                player.has_drawn = false;
                world.write_model(@player);
            }

            game.current_turn = next_player(game.current_turn, game.direction, game.player_count);
            game.turn_deadline = get_block_timestamp() + 30;
            world.write_model(@game);

            world.emit_event(@TurnSkipped { game_id, player_idx: timed_out_player });
        }
    }

    fn draw_cards(
        ref world: dojo::world::WorldStorage,
        game_id: u32,
        player_idx: u8,
        count: u8,
        ref game: Game,
    ) {
        let mut drawn: u8 = 0;
        loop {
            if drawn >= count || game.draw_index >= 108 {
                break;
            }
            let mut card: DeckCard = world.read_model((game_id, game.draw_index));
            card.location = player_idx + 2;
            world.write_model(@card);
            game.draw_index += 1;
            drawn += 1;
        };

        let mut player: PlayerState = world.read_model((game_id, player_idx));
        player.card_count += drawn;
        world.write_model(@player);
    }

    fn next_player(current: u8, direction: u8, player_count: u8) -> u8 {
        if direction == 0 {
            (current + 1) % player_count
        } else {
            if current == 0 {
                player_count - 1
            } else {
                current - 1
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"unozap")
        }
    }
}
