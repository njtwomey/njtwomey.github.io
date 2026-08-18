# inbox

Drop paper PDFs here and ask Claude to "add my new papers".

The `add-publications` skill renames each file to its citation key, moves it to `public/pdf/`,
and writes the matching record into `content/publications.bib`. Nothing in this directory is
served or built — it is a staging area, and it should be empty between runs.
