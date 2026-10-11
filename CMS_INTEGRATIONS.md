# Publishing to blog platforms: research and plan

Research date: October 2026. Covers what SaaS blogs run on, the common post structure, what Google needs, how FAQs are handled, and how to connect to each platform.

## Status (built)
| Piece | Where | State |
|---|---|---|
| One article format → HTML, Markdown, WordPress blocks, JSON-LD, full page | `src/post.ts` | Built |
| Article images (cover, checklist, steps, table) as real files with matching alt text | `src/cards.ts` | Built. An image model can replace them later; alt text and placement stay |
| Copy with formatting, Copy HTML, Copy Markdown, Download .zip | `src/article-data.ts`, `src/components/publish.tsx` | Built |
| WordPress, Webflow, HubSpot, Ghost publishing (images, SEO fields, schema, read-back check) | `server/publish.ts` | Built; tested against stand-in APIs, not yet against live accounts |
| Connections (keys kept in `.secrets/`, never in the browser), Webflow field matching | `server/connections.ts`, `server/api.ts`, `src/components/connections.tsx` | Built |
| WordPress SEO fields plugin | `integrations/wordpress/comarketer-seo-fields.php` | Built |
| Framer, Wix, Shopify | | Next. Copy and Download work for them today |

## 1. What SaaS blogs run on

### Our own check (October 2026)
We fetched the blog page of 130 SaaS companies and detected the platform from its fingerprint (WordPress `wp-content`, Webflow `data-wf-site`, Framer `framerusercontent.com`, HubSpot `hubspotusercontent`, Ghost generator tag, headless CMS image hosts such as `ctfassets.net` or `cdn.sanity.io`). Script: `scratchpad/cms-detect.mjs`.

| Platform | Small and mid-size SaaS (60) | Large SaaS (70) |
|---|---|---|
| WordPress | **16** | 14 |
| Webflow | **14** | 5 |
| Framer | 4 | 1 |
| Ghost | 2 | 1 |
| HubSpot CMS | 1 | 2 |
| Headless CMS (Contentful, Sanity, Storyblok, Prismic, Strapi, Builder.io) | 4 | **21** |
| Custom app, no CMS visible (Next.js, Astro, Nuxt, Gatsby) | 10 | 12 |
| Could not tell or blocked | 9 | 13 |
| Drupal | 0 | 1 |

What it means for us. Our buyers are founders and small marketing teams, which is the left column:
- **WordPress and Webflow cover about half** of small SaaS blogs. They come first.
- **Framer is growing** among new startups and is third.
- **Ghost and HubSpot** are small but simple to support.
- Large companies mostly run a headless CMS or a custom site. For them, the answer is export (HTML, Markdown) or a webhook, not a native integration.

### Whole-web numbers (for context)
- W3Techs: WordPress runs about 40 to 43% of all websites and about 59 to 61% of sites with a known CMS, slowly declining since its 2025 peak. Shopify, Wix and Squarespace follow. [colorlib](https://colorlib.com/wp/cms-market-share/), [SEJ](https://www.searchenginejournal.com/cms-market-share-trends-top-content-management-systems-october-2025/556349/)
- HTTP Archive (April 2026): Framer, Webflow and Duda took a growing share of new sites. [landbase](https://www.landbase.com/blog/cms-market-share-statistics)
- An agency sample of 195 US B2B SaaS companies found WordPress on more than half. Agency source, treat as one data point. [Solid Digital](https://soliddigital.com/blog/the-state-of-b2b-saas-marketing)

## 2. The common structure of a blog post

Every platform stores the same core fields under different names. Comarketer keeps one internal post and maps it to each platform.

| Comarketer field | WordPress | Webflow | Framer | HubSpot | Ghost |
|---|---|---|---|---|---|
| Title (H1) | `title` | `name` | collection field | `name` | `title` |
| Slug | `slug` | `slug` | `slug` | `slug` | `slug` |
| Body | `content` (HTML) | rich text field (HTML) | formatted text field | `postBody` (HTML) | `html` with `?source=html` |
| SEO title | SEO plugin meta | custom field or page settings | field | `htmlTitle` | `meta_title` |
| Meta description | SEO plugin meta | custom field | field | `metaDescription` | `meta_description` |
| Excerpt | `excerpt` | custom field | field | `postSummary` | `custom_excerpt` |
| Featured image and alt | `featured_media` (upload first) | image field (URL) + alt | image field | `featuredImage`, `featuredImageAltText` | `feature_image`, `feature_image_alt` |
| Author | `author` (user ID) | reference field | field | `blogAuthorId` | `authors` |
| Categories and tags | `categories`, `tags` (IDs) | reference or option fields | fields | `tagIds` | `tags` |
| Publish state | `status`: draft, publish, future | staged or live item | draft flag | `state`: DRAFT, SCHEDULED, PUBLISHED | `status`: draft, published, scheduled |
| Publish date | `date` | publish call | n/a | `publishDate` | `published_at` |
| Extra head code (schema) | via SEO plugin | template custom code bound to a field | page custom code | per-post head HTML | `codeinjection_head` |

Two things vary by site and need a one-time **field mapping** step: Webflow and Framer blogs are custom CMS collections, so field names differ on every site. The connection screen reads the collection's fields and lets the user match them (we pre-match by name and type).

## 3. What Google needs

Google does not require any special format. It needs a clean, readable page. What matters, in order:

1. **One H1** (the title), then H2 and H3 in order. Headings that make sense on their own.
2. **Title tag** (about 60 characters) and **meta description** (about 150 characters). Google may rewrite either, but good ones are kept more often.
3. **A clean slug**: short, lowercase, hyphens, the keyword, never changed after publishing.
4. **Canonical URL** pointing at the post itself (the platform usually does this).
5. **Images** with real alt text, a sensible file name, compressed, width and height set.
6. **Internal links** to product pages and related posts; outbound links to original sources.
7. **Structured data**: `BlogPosting` (or `Article`) JSON-LD. Google lists no required properties; the useful ones are `headline`, `image`, `datePublished`, `dateModified`, and `author` with `name` and a `url` to an author page. [Google: Article structured data](https://developers.google.com/search/docs/data-types/article)
8. **The post in the sitemap** and a visible author and date on the page.

### FAQs: what changed
- **FAQ rich results are gone.** As of May 7, 2026, Google no longer shows FAQ rich results in Search. Search Console's FAQ report and the Rich Results Test support were removed after that. Before this, they only appeared for well-known government and health sites anyway. [Google FAQPage docs](https://developers.google.com/search/docs/data-types/faqpage), [Search Engine Roundtable](https://www.seroundtable.com/google-drops-faq-rich-results-41298.html)
- **HowTo rich results** were removed by Google in 2023.
- **FAQ sections are still worth writing.** Readers use them, and AI answer engines (Google AI Overviews, ChatGPT, Perplexity) quote clear question and answer pairs. Write them as an H2 "Frequently asked questions" with each question as an H3 and a 2 to 4 sentence answer directly below.
- **FAQPage JSON-LD is optional.** It is harmless and some AI tools read it, but it earns nothing in Google now. Default: off. Setting: "Add FAQ schema".

### Who adds the schema (avoid duplicates)
| Platform | Article schema added automatically? | What Comarketer does |
|---|---|---|
| WordPress + Yoast or Rank Math | Yes, by the SEO plugin | Send SEO title, description and focus keyword to the plugin's fields. Add nothing else. |
| WordPress without an SEO plugin | Depends on the theme, often no | Offer to add BlogPosting JSON-LD inside the post content |
| Webflow | No | Write the JSON-LD into a "Schema" field; one-time setup binds it into the template's head |
| Framer | No | Same as Webflow, through a field and page custom code |
| HubSpot | Yes, basic | Leave it; add extra only through per-post head HTML if needed |
| Ghost | Yes, Article on every post | Leave it; never inject a second Article block |
| Shopify | Usually by the theme | Leave it |

## 4. How to connect to each platform

| Platform | How the user connects | Create and publish | Body format | Watch out for |
|---|---|---|---|---|
| **WordPress** | Site URL + Application Password (Users → Profile) | `POST /wp-json/wp/v2/posts`, `status: draft`; images via `POST /wp/v2/media` first | HTML (lands in a Classic block; fine for readers and SEO) | Yoast and Rank Math meta keys are not writable over REST by default; the request returns 200 and silently drops them. Needs a tiny companion plugin that registers `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `rank_math_title`, `rank_math_description`. Always read the post back to confirm. [SEO REST API plugin](https://wordpress.org/plugins/seo-rocket-integration) |
| **Webflow** | OAuth app (best) or a site API token (paid site plan) | `POST /v2/collections/{id}/items` creates a draft; `/items/live` publishes immediately | Rich text field takes HTML | Code blocks are not supported in rich text through the API; images in rich text must be hosted URLs; field slugs differ per site, so map once. [Webflow docs](https://developers.webflow.com/data/docs/working-with-the-cms/manage-collections-and-items), [create live item](https://developers.webflow.com/data/reference/cms/collection-items/live-items/create-item-live.mdx) |
| **Framer** | API key from site settings, Server API (`framer-api` package) | Add items to a CMS collection, then publish | Formatted text field | Open beta, free for now, WebSocket based; collections are custom, so map fields once. [Framer Server API](https://www.framer.com/updates/server-api) |
| **HubSpot** | OAuth app with the `content` scope (or private app) | `POST /cms/v3/blogs/posts` (draft); publish with `state: PUBLISHED`, or `POST .../schedule` with `publishDate` | `postBody` HTML | Needs the blog's `contentGroupId`; slug required before publishing; HubSpot says complex module layouts are better built in its editor. [HubSpot blog post API](https://developers.hubspot.com/docs/api/cms/blog-post) |
| **Ghost** | Admin API key (`id:secret`), signed into a short-lived token per request | `POST /ghost/api/admin/posts/?source=html`, `status: draft` | HTML, converted to Ghost's Lexical format | Conversion is lossy; wrap the body in an HTML card for exact output; test on a draft and read it back. [Ghost Admin API](https://docs.ghost.org/admin-api/posts/creating-a-post) |
| **Wix** | Wix app (OAuth) | Create draft post, then publish | Ricos JSON, not HTML; convert first | Author member ID required; external images must be imported to Wix Media first; 400 KB post limit. [Wix Blog API](https://dev.wix.com/docs/api-reference/business-solutions/blog/skills/how-to-create-blog-posts) |
| **Shopify** | Custom or public app (OAuth) | GraphQL `articleCreate` with `isPublished: false` | `body` HTML | REST is legacy; new apps must use GraphQL. SEO title and description go in `global.title_tag` and `global.description_tag` metafields (verify). [ArticleCreateInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ArticleCreateInput) |
| **Headless and custom** (Contentful, Sanity, Next.js) | Export, or a webhook to their own endpoint | They import it | Markdown, HTML, or JSON | Every setup differs; offer clean exports plus a signed webhook with the full post JSON. |
| **Squarespace** | No blog writing API | Copy HTML, or import file | HTML | Export only. |

## 5. How Comarketer should publish

1. **Draft by default.** Every platform gets a draft first. The user checks it in their CMS, then publishes from there or with one click in Comarketer. Publishing straight to live is an opt-in setting.
2. **Connect once in Settings.** OAuth where the platform offers it (Webflow, HubSpot, Wix, Shopify), a key or app password otherwise (WordPress, Ghost, Framer). Keys are stored encrypted on the server, never in the browser.
3. **Map fields once** for Webflow and Framer: we read the collection's fields, pre-match them, and the user confirms.
4. **Images first.** Upload the 3 to 4 generated images to the platform's media library, then insert their hosted URLs and alt text into the body.
5. **SEO fields go where the site expects them**: SEO plugin fields on WordPress, native fields on HubSpot and Ghost, mapped fields on Webflow and Framer.
6. **Schema without duplicates**, following the table in section 3.
7. **Read back and verify** after every publish: title, slug, meta description, images and links. Show "Published and checked" or say what failed.
8. **Keep the link.** Store the post's platform ID and live URL, so "Refresh article" updates the same post and nothing is published twice.
9. **Always available**: Copy HTML, Copy Markdown, Download (HTML, Markdown, images), and Google Docs.

## 6. Build order

| Order | Integration | Why |
|---|---|---|
| 1 | Copy HTML, Markdown, download (already designed) | Works for every platform, including custom sites |
| 2 | WordPress | Biggest share; needs the small SEO-fields companion plugin |
| 3 | Webflow | Second biggest for SaaS; OAuth plus field mapping |
| 4 | Framer | Fast-growing among startups; Server API is in open beta |
| 5 | HubSpot, Ghost | Simple, well-documented APIs |
| 6 | Webhook for headless and custom sites | Covers larger companies |
| 7 | Wix, Shopify | Less common for SaaS; Wix needs HTML to Ricos conversion |

## 7. What still needs checking before building
- WordPress: test the companion plugin with current Yoast and Rank Math versions.
- Webflow: confirm the bulk publish endpoint path in Webflow's own reference.
- Framer: confirm the exact item create method in the `framer-api` GitHub docs (third-party pages describe it).
- Ghost: confirm `meta_title`, `meta_description` and `codeinjection_head` are writable in the same create call.
- Shopify: confirm the SEO metafield keys.

## Sources
- [Google: Article structured data](https://developers.google.com/search/docs/data-types/article)
- [Google: FAQPage structured data](https://developers.google.com/search/docs/data-types/faqpage)
- [Search Engine Roundtable: Google drops FAQ rich results](https://www.seroundtable.com/google-drops-faq-rich-results-41298.html)
- [Colorlib: CMS market share 2026](https://colorlib.com/wp/cms-market-share/)
- [Landbase: CMS market share statistics](https://www.landbase.com/blog/cms-market-share-statistics)
- [Search Engine Journal: CMS market share October 2025](https://www.searchenginejournal.com/cms-market-share-trends-top-content-management-systems-october-2025/556349/)
- [Solid Digital: State of B2B SaaS marketing](https://soliddigital.com/blog/the-state-of-b2b-saas-marketing)
- [WordPress SEO REST plugin example](https://wordpress.org/plugins/seo-rocket-integration)
- [Webflow: managing collections and items](https://developers.webflow.com/data/docs/working-with-the-cms/manage-collections-and-items)
- [Webflow: create live item](https://developers.webflow.com/data/reference/cms/collection-items/live-items/create-item-live.mdx)
- [Webflow: CMS API getting started](https://webflow.com/blog/getting-started-webflow-cms-api)
- [Finsweet: dynamic Webflow CMS schema](https://finsweet.com/seo/article/dynamic-webflow-cms-schema-markup)
- [Framer: Server API](https://www.framer.com/updates/server-api)
- [HubSpot: blog post API](https://developers.hubspot.com/docs/api/cms/blog-post)
- [Ghost: creating a post](https://docs.ghost.org/admin-api/posts/creating-a-post)
- [Ghost: ghost_head helper](https://ghost.org/docs/themes/helpers/ghost_head_foot)
- [Wix: how to create blog posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/skills/how-to-create-blog-posts)
- [Shopify: ArticleCreateInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ArticleCreateInput)
