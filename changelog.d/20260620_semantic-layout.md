### Changed

- Layout x/y now reflects text similarity: UMAP runs over each paper's TF-IDF (title + abstract) blended with its categories, instead of categories alone, so topically related papers cluster together. The z axis still encodes publication date. (#98)
