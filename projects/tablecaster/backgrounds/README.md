# Tablecaster backgrounds

Owner images for the Background picker. Human-made only (own photos or hand-made textures). No generative AI, no stock art.

## Add an image

From a source photo `source.jpg`, with id `workshop-concrete` (lowercase slug, never reused):

```sh
magick source.jpg -resize 3000x2200^ -gravity center -extent 3000x2200 -strip \
  \( +clone -quality 80 -write workshop-concrete.webp +delete \) \
  -resize '320x235!' -quality 70 workshop-concrete.thumb.webp
```

- Full image: 3000x2200 WebP, `-quality 80`, at most 1.5 MB (lower the quality if it's bigger).
- Thumbnail: 320x235 WebP, at most 30 KB.
- At most 12 images.

Then add an entry to `backgrounds.json`, in picker order:

```json
{"id":"workshop-concrete","kind":"image","title":"Workshop concrete","file":"workshop-concrete.webp","thumb":"workshop-concrete.thumb.webp"}
```

The files are cached as immutable: never replace one in place. A changed image gets a new filename and id. Removing an entry retires the image; old links fall back to no Background.
