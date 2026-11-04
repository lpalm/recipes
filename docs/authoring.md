# Writing a recipe

One file per recipe in `recipes/`, named `<id>.txt`; add the id to `recipes/index.txt`. Write quantities in the units the source uses; the app shows either system and converts the other. Temperatures always display in Fahrenheit, including in metric mode.

```
Title
portions 2
category Sides

produce:
3 cloves garlic, sliced thin
spices:
salt
kitchen:
2 l water

water + salt > boil: Bring to a rolling boil. ~8 min [large pot]
boil + garlic > cook: Cook until golden. ~4 min [oven 220 fan]
```

`category` groups the library; reuse an existing name (Breakfast, Cocktail, Creami, Dessert, Drinks, Non-vegan Mains, Other Vegan Mains, Pizza Making, Sides, Snacks, Spice mixes, Toddler, Tofu Vegan Mains) and it is searchable. A line ending in a colon starts a shopping section for the ingredient lines below it. Use the store's order: produce, meat, fish, dairy, bakery, pantry, spices, frozen, then kitchen for what is never bought (water).

Ingredient line: `amount unit name, prep`. Amount (`2`, `1.5`, `1/2`, `1 1/2`) and unit are optional; unknown units become part of the name (`2 eggs`). Units that convert: g, kg, oz, lb; ml, l, tsp, tbsp, cup; cm, inch. Cups of flour or sugar convert to milliliters, not grams; weigh dry ingredients in grams when converting a US recipe. Names must be unique; use `salt for the water` for a second salt. Prep after the comma shows on the step that uses the ingredient.

Every number in prep or instructions must declare its scaling. Use `{180 g}` for an amount that changes with portions, including substitutes, total package counts and quantities mentioned in instructions. Use `{=15 oz}` for a fixed package size, time, temperature, ratio or per-piece measurement. Number words such as `two` and `half`, and measurements such as `a cup` or `a pinch`, follow the same rule. The parser rejects these unmarked quantities. Examples:

```
100 g heavy cream, or {180 g} half-and-half
30 oz beans, {2 cans}, {=15 oz} per can
1 bag rice, {=175 to 200 g} per bag
```

In instructions, `add {2 to 3 tbsp} jam` scales both ends of the range; `bake at {=350°F} for {=15 minutes}` stays fixed. A proportional instruction such as `use {=half} the sauce` stays proportional as the sauce amount changes. `Add the water {=1 tbsp} at a time` keeps each addition fixed while the ingredient list supplies the scaled total. Keep repeated amounts in the ingredient list and refer to the ingredient in prose instead of duplicating its quantity. Use extra pans, containers or batches when increasing portions; pan sizes and per-piece sizes stay fixed.

Before adding or changing a recipe:

1. Match every ingredient, substitute and amount to the source, including its base portions. Never invent an omitted amount or silently label it "to taste"; resolve it with the recipe owner.
2. Put each total amount at the start of its ingredient line. Mark any remaining quantities in prep or instructions as scalable or fixed using the rules above. Do not mark a batch total fixed just to pass validation.
3. Compare the base recipe and double portions: all ingredient totals, substitutes, counts and ranges must double; times, temperatures, package sizes and per-piece sizes must stay fixed. Check metric and US display.
4. Run `npm run validate` before committing or publishing. It runs the parser, map, unit, rendered-app and recipe validation tests, then checks every recipe's cooking map and index.

The checks catch unmarked quantities and scaling regressions; source review determines whether a quantity or substitution is correct. Keep source amounts at full precision: scaling and conversion happen before display rounding. Decimal quantities display at most three significant digits, while exact kitchen fractions stay fractions.

Step line, in cooking order: `inputs > label: instruction ~time [equipment]`. Inputs are ingredient names or labels of earlier steps, joined with `+`. `~8 min`, `~1 h 30 min` gives the step a timer. `[oven 220 fan]` is an oven setting in °C (`[oven 425 F]` for Fahrenheit; drop `fan` for conventional); other brackets are equipment. Write temperatures directly in instructions, ingredient prep, or equipment labels (including air fryers) in Fahrenheit.

Rules the parser enforces: every ingredient feeds exactly one step, every step feeds exactly one later step, the last step is the dish.

Converting a recipe:
- Labels are 1–2 words; the map shows only the label and time.
- Each new pot or bowl starts a step with no step input. Adding to a pot is a step whose inputs are that pot's last step plus the new ingredients. Combining pots is a step with two or more step inputs.
- Order the steps as you would cook them; the map is derived from the inputs, the cooking sequence from the line order.
- Prep that takes real time (marinate, rise) is its own step; otherwise it goes after the comma.
- Preheating is not a step: the recipe screen shows the oven setting of the first step that has one.
- Omit a number only for an intentionally unmeasured amount, such as `salt, to taste` or oil for greasing a pan. A missing source quantity is unresolved recipe data, not a fixed amount.
