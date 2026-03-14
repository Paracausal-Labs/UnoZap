#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct DeckCard {
    #[key]
    pub game_id: u32,
    #[key]
    pub card_index: u8,
    pub card_color: u8, // 0=Red, 1=Yellow, 2=Green, 3=Blue, 4=Wild
    pub card_value: u8, // 0-9, 10=Skip, 11=Reverse, 12=DrawTwo, 13=Wild, 14=WildDraw4
    pub location: u8, // 0=draw_pile, 1=discard, 2=player0, 3=player1, 4=player2, 5=player3
}

/// Returns (color, value) for a given card_id (0-107).
///
/// Deck layout:
///   Per color (0-3): 25 cards each (IDs 0-24, 25-49, 50-74, 75-99)
///     offset 0 = number 0
///     offsets 1-2 = number 1, offsets 3-4 = number 2, ... offsets 17-18 = number 9
///     offsets 19-20 = Skip, offsets 21-22 = Reverse, offsets 23-24 = DrawTwo
///   IDs 100-103 = Wild (color=4, value=13)
///   IDs 104-107 = Wild Draw Four (color=4, value=14)
pub fn card_info(card_id: u8) -> (u8, u8) {
    if card_id >= 104 {
        return (4, 14);
    }
    if card_id >= 100 {
        return (4, 13);
    }
    let color = card_id / 25;
    let offset = card_id % 25;
    if offset == 0 {
        return (color, 0);
    }
    let value = (offset - 1) / 2 + 1;
    (color, value)
}
