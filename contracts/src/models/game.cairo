use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Game {
    #[key]
    pub game_id: u32,
    pub creator: ContractAddress,
    pub join_code: felt252,
    pub player_count: u8,
    pub current_turn: u8,
    pub direction: u8, // 0 = clockwise, 1 = counter-clockwise
    pub top_color: u8, // 0=Red, 1=Yellow, 2=Green, 3=Blue
    pub top_value: u8, // 0-9=number, 10=Skip, 11=Reverse, 12=DrawTwo, 13=Wild, 14=WildDraw4
    pub state: u8, // 0=Waiting, 1=Playing, 2=Finished
    pub winner: ContractAddress,
    pub turn_deadline: u64,
    pub draw_index: u8,
    pub seed: felt252,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GameCounter {
    #[key]
    pub id: u8,
    pub count: u32,
}
