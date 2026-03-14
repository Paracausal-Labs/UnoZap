use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerState {
    #[key]
    pub game_id: u32,
    #[key]
    pub player_idx: u8,
    pub address: ContractAddress,
    pub card_count: u8,
    pub has_drawn: bool,
}
