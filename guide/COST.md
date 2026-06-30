# Cost

This runs entirely within Cloudflare's free tier for typical single-user usage:

| Service                  | Free Tier               | Typical usage                         |
| ------------------------ | ----------------------- | ------------------------------------- |
| Workers (requests)       | 100,000 / day           | Each redirect or API call = 1 request |
| Workers (CPU time)       | 10 ms / request         | Redirects are sub-millisecond         |
| D1 (storage)             | 5 GB                    | A links table stays well under 1 MB   |
| D1 (reads)               | 5 million rows / day    | Each redirect reads 1 row             |
| D1 (writes)              | 100,000 rows / day      | Click count updates + new links       |
| Zero Trust Access        | Free for up to 50 users | Single-user auth                      |
| Google Safe Browsing API | Unlimited, free         | Optional reputation check             |

If you exceed the free tier, paid pricing is $0.30 per million requests and
$0.02 per million CPU-ms for Workers, plus $0.001 per million rows read for D1.
For a personal shortener you'd need significant viral traffic to incur any charges.

Source: [Cloudflare Developer Platform Pricing](https://workers.cloudflare.com/pricing.md)
