# Donny's Backend Service

## This is a backend that should do following: 
1. It should be able to scrape content from youtube and facebook. It should not use auth but use 3rd party tools to scrape the content. Youtube and Facebook handles will be provided. This scraping should run once everyday and an admin should be able to manually trigger it through an API call.
    + All videos need to be scraped from both yt and fb
    + All photos need to be scraped from both yt and fb
    + All events should be scraped from fb
    + Contact information should also be scraped from fb
2. Since the facebook and youtube channels are mine, we don't need to worry about legalities. To begin with, for the MVP, I don't want to use API keys but down the road I might consider it. For now, we'll go with web scraping/crawling.
3. The videos from yt and fb will be embedded in a separate frontned. The APIs should simply serve the metadata (photos, and videos) for frontend to reach out to yt and fb links
4. The API should be able to return events
5. The API should be able to collect contact information from fb page and serve to the frontend

## Instructions
Recommend the tech stack you'd propose to use
