## Why

A world is one house. Everything Rotem has made lives inside those four rooms,
and a school built in them is a school instead of a home rather than as well as
one — and nobody can walk to it.

A street makes a world a place with more than one building in it. The same
family can live in one and go to another, which is the difference between a
school and a room with a whiteboard in it.

## What Changes

- **A world is a street** with room for three buildings on it. The house that
  is there now becomes the first building, with nothing to do on her part.
- **Buildings** have a name and a kind, and their own four rooms.
- **The street** is a scene: the fronts of the buildings in a row, a pavement,
  and empty plots with a plus on them for the next one.
- **Going in and out**: tapping a building opens its cutaway; the way back out
  is the street rather than the shelf of worlds.
- **Walking there**: a character can be sent from a room in one building to the
  street, and from the street into another building. She walks out of the front
  door, along the pavement and in the other one.
- **The picture on the shelf** becomes the street rather than the one house.

## Impact

- `js/model/world.js` — buildings, and a migration that wraps the old house
- `js/model/travel.js` — a journey that leaves the building it started in
- `js/scenes/street.js` — the new scene
- `js/scenes/house.js`, `js/main.js` — which building is open
