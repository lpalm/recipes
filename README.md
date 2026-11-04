# Recipes

Personal recipe app for the iPhone home screen: one text file per recipe, a map of what combines with what, and one step per screen while cooking.

- Add to home screen: open the site in Safari, Share → Add to Home Screen.
- Write recipes: follow the [authoring rules](docs/authoring.md), then run `npm run validate` before committing. This checks every recipe, cooking map and scaling regression.
- `npm run shots` renders iPhone screenshots into `shots/`; `npm run serve` serves the app locally.
