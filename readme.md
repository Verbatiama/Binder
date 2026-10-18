# Binder

A virtual card binder for a Magic: The Gathering legendary creature collection. Cards are laid out nine to a page and you flip through them like a real binder. Cards you don't own are greyed out.

## Features

- Two-page spread in landscape, single page in portrait
- Swipe or click the binder edges to turn pages, or jump straight to a page number
- Click a card to see a larger image
- Images for nearby pages are prefetched so page turns feel quick

## Data sources

- Collection and card lists: [LegendaryCreatureCollectionStorage](https://github.com/Verbatiama/LegendaryCreatureCollectionStorage) (`collection.json`, `FullCards.json`)
- Card images: a Scryfall image cache at `fanable.verbatiam.dev`

## Development

Requires Node 26 (see `.nvmrc`).

```sh
npm install
npm run dev          # start the Vite dev server
npm run build        # production build to dist/
npm run warm:images  # pre-load every card image into the image cache
```

`warm:images` defaults to 500 requests per minute. Pass `-- --rate <n>` to change it.

## Deployment

Every push to `main` builds the site and deploys it to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Roadmap

1. ~~Reproduce existing spreadsheet main page based hardcoded JSON file~~
2. ~~Commit the JSON file to this repo~~
3. ~~Fetch the JSON data onto the page~~
4. ~~Render the JSON as a table~~
6. Convert JSON file to CosmoDB
7. Replace API call to point to CosmoDB
8. Convert PowerShell script to an Azure funtion
9. Create an Azure function to update owned cards
10. Allow updates via Javascript on page
11. ~~Visualise folder~~
    - ~~Lookup card images~~
    - ~~Arrange into grid, navigate via book and page~~
    - Click on the image to set owned
    - ~~Grey out unowned~~

## Reference links

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- https://get.dev/
- https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure?tabs=portal
- https://learn.microsoft.com/en-us/azure/storage/blobs/blob-upload-function-trigger-javascript?tabs=storage-resource-visual-studio-code%2Ccomputer-vision-azure-portal%2Ccosmos-db-azure-portal
- https://stackoverflow.com/questions/19619450/how-do-i-add-file-to-remote-git-repo-github-without-cloning-the-whole-repo-fir
- https://stackoverflow.com/questions/22403218/html-automatically-fetching-json-file-from-github-repo
- https://git-scm.com/book/en/v2/Git-Tools-Submodules
- https://github.com/gitname/react-gh-pages
