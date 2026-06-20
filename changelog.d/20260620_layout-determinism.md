### Changed

- The 3D layout now reduces papers with UMAP's `cosine` metric (correct for the sparse TF-IDF feature vectors, where Euclidean distance concentrates) and pins numba to a single thread (`n_jobs=1` + `NUMBA_NUM_THREADS=1` in CI) so builds are reproducible. (#99)
