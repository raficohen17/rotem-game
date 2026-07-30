# Tasks

## 1. Food itself

- [x] 1.1 `js/model/food.js` — portions, `biteFrom`, what a cat will eat
- [x] 1.2 A food drawer in the catalogue: cake and steak
- [x] 1.3 Steak art, and cake drawn with slices missing
- [x] 1.4 Portions survive a save; nonsense counts read as whole

## 2. Eating

- [x] 2.1 `eat` action, offered when a character is near food
- [x] 2.2 A bite changes the food and leaves her standing there
- [x] 2.3 The last portion removes it from the room
- [x] 2.4 Test: the button is gone once the food is

## 3. The fridge

- [x] 3.1 An item can be inside another; it survives a save
- [x] 3.2 Dropping food on an open fridge puts it in
- [x] 3.3 Drawn only when the door is open
- [ ] 3.4 Draggable back out

## 4. The cat

- [x] 4.1 Food it likes beats furniture when deciding
- [x] 4.2 It eats a portion on arrival
- [x] 4.3 It ignores cake, and anything in the fridge
- [x] 4.4 Test: it goes back to furniture when the food is gone

## 5. Checks

- [x] 5.1 `npm test`
- [ ] 5.2 Screenshots at 915x412: cake on a table, in the fridge, part-eaten,
      and a cat at a steak
- [ ] 5.3 Bump both versions, commit, merge, push
