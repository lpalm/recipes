# Writing a recipe

One file per recipe in `recipes/`, named `<id>.txt`; add the id to `recipes/index.txt`. Write quantities in the units the source uses; the app shows either system and converts the other.

```
Title
portions 2

produce:
3 cloves garlic, sliced thin
spices:
salt
kitchen:
2 l water

water + salt > boil: Bring to a rolling boil. ~8 min [large pot]
boil + garlic > cook: Cook until golden. ~4 min [oven 220 fan]
```

A line ending in a colon starts a shopping section for the ingredient lines below it. Use the store's order: produce, meat, fish, dairy, bakery, pantry, spices, frozen, then kitchen for what is never bought (water).

Ingredient line: `amount unit name, prep`. Amount (`2`, `1.5`, `1/2`, `1 1/2`) and unit are optional; unknown units become part of the name (`2 eggs`). Units that convert: g, kg, oz, lb; ml, l, tsp, tbsp, cup; cm, inch. Cups of flour or sugar convert to millilitres, not grams — weigh dry ingredients in grams when converting a US recipe. Names must be unique; use `salt for the water` for a second salt. Prep after the comma shows on the step that uses the ingredient.

Step line, in cooking order: `inputs > label: instruction ~time [equipment]`. Inputs are ingredient names or labels of earlier steps, joined with `+`. `~8 min`, `~1 h 30 min` gives the step a timer. `[oven 220 fan]` is an oven setting in °C (`[oven 425 F]` for Fahrenheit; drop `fan` for conventional); other brackets are equipment.

Rules the parser enforces: every ingredient feeds exactly one step, every step feeds exactly one later step, the last step is the dish.

Converting a recipe:
- Labels are 1–2 words; the map shows only the label and time.
- Each new pot or bowl starts a step with no step input. Adding to a pot is a step whose inputs are that pot's last step plus the new ingredients. Combining pots is a step with two or more step inputs.
- Order the steps as you would cook them; the map is derived from the inputs, the cooking sequence from the line order.
- Prep that takes real time (marinate, rise) is its own step; otherwise it goes after the comma.
- Preheating is not a step: the recipe screen shows the oven setting of the first step that has one.
- Amounts that don't scale (`salt`) get no number.
